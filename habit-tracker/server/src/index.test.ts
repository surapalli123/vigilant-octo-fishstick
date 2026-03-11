import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from './index'

const { mockFindMany, mockCreate, mockFindUnique, mockHabitLogFindMany, mockHabitLogUpsert } =
  vi.hoisted(() => ({
    mockFindMany: vi.fn(),
    mockCreate: vi.fn(),
    mockFindUnique: vi.fn(),
    mockHabitLogFindMany: vi.fn(),
    mockHabitLogUpsert: vi.fn(),
  }))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    habit: { findMany: mockFindMany, create: mockCreate, findUnique: mockFindUnique },
    habitLog: { findMany: mockHabitLogFindMany, upsert: mockHabitLogUpsert },
    $disconnect: vi.fn(),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockHabitLogFindMany.mockResolvedValue([])
})

describe('GET /health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('GET /api/habits', () => {
  it('returns an empty array when no habits exist', async () => {
    mockFindMany.mockResolvedValue([])
    const res = await request(app).get('/api/habits')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(0)
  })

  it('returns the list of habits', async () => {
    const habit = { id: 1, name: 'Run', frequency: 'daily', active: true }
    mockFindMany.mockResolvedValue([habit])
    const res = await request(app).get('/api/habits')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Run')
  })
})

describe('POST /api/habits', () => {
  it('creates a new habit with defaults', async () => {
    const created = { id: 1, name: 'Meditate', frequency: 'daily', active: true }
    mockCreate.mockResolvedValue(created)
    const res = await request(app).post('/api/habits').send({ name: 'Meditate' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Meditate')
    expect(res.body.frequency).toBe('daily')
    expect(res.body.active).toBe(true)
    expect(res.body.id).toBeDefined()
  })

  it('creates a habit with weekly frequency', async () => {
    const created = { id: 2, name: 'Long run', frequency: 'weekly', active: true }
    mockCreate.mockResolvedValue(created)
    const res = await request(app)
      .post('/api/habits')
      .send({ name: 'Long run', frequency: 'weekly' })
    expect(res.status).toBe(201)
    expect(res.body.frequency).toBe('weekly')
  })

  it('returns 400 when frequency is invalid', async () => {
    const res = await request(app)
      .post('/api/habits')
      .send({ name: 'Run', frequency: 'monthly' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('frequency must be daily or weekly')
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app).post('/api/habits').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('name is required')
  })

  it('returns 400 when name is empty string', async () => {
    const res = await request(app).post('/api/habits').send({ name: '   ' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('name is required')
  })
})

describe('GET /api/habits completedToday', () => {
  it('returns completedToday: false when no log exists for today', async () => {
    const habit = { id: 1, name: 'Run', frequency: 'daily', active: true }
    mockFindMany.mockResolvedValue([habit])
    mockHabitLogFindMany.mockResolvedValue([])
    const res = await request(app).get('/api/habits')
    expect(res.status).toBe(200)
    expect(res.body[0].completedToday).toBe(false)
  })

  it('returns completedToday: true when a log exists for today', async () => {
    const habit = { id: 1, name: 'Run', frequency: 'daily', active: true }
    mockFindMany.mockResolvedValue([habit])
    mockHabitLogFindMany.mockResolvedValue([{ habitId: 1 }])
    const res = await request(app).get('/api/habits')
    expect(res.status).toBe(200)
    expect(res.body[0].completedToday).toBe(true)
  })
})

describe('POST /api/habits/:id/complete', () => {
  it('records completion for today and returns 201', async () => {
    const habit = { id: 1, name: 'Run', frequency: 'daily', active: true }
    const log = { id: 1, habitId: 1, date: '2024-01-01', createdAt: new Date() }
    mockFindUnique.mockResolvedValue(habit)
    mockHabitLogUpsert.mockResolvedValue(log)
    const res = await request(app).post('/api/habits/1/complete')
    expect(res.status).toBe(201)
    expect(res.body.habitId).toBe(1)
  })

  it('returns 404 when habit does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)
    const res = await request(app).post('/api/habits/999/complete')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Habit not found')
  })

  it('returns 400 when id is not a number', async () => {
    const res = await request(app).post('/api/habits/abc/complete')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid habit ID')
  })

  it('does not create a duplicate when the habit is already completed today', async () => {
    const habit = { id: 1, name: 'Run', frequency: 'daily', active: true }
    const log = { id: 1, habitId: 1, date: '2024-01-01', createdAt: new Date() }
    mockFindUnique.mockResolvedValue(habit)
    mockHabitLogUpsert.mockResolvedValue(log)

    // First completion
    const first = await request(app).post('/api/habits/1/complete')
    expect(first.status).toBe(201)

    // Second completion on the same day — upsert returns the existing record
    const second = await request(app).post('/api/habits/1/complete')
    expect(second.status).toBe(201)
    expect(second.body.habitId).toBe(1)

    // Confirm upsert (not create) was used both times — enforces the unique constraint
    expect(mockHabitLogUpsert).toHaveBeenCalledTimes(2)
    expect(mockHabitLogUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ habitId_date: expect.any(Object) }),
      }),
    )
  })
})
