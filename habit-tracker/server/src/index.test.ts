import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from './index'

const { mockFindMany, mockCreate, mockFindUnique, mockUpdate, mockHabitLogFindMany, mockHabitLogUpsert } =
  vi.hoisted(() => ({
    mockFindMany: vi.fn(),
    mockCreate: vi.fn(),
    mockFindUnique: vi.fn(),
    mockUpdate: vi.fn(),
    mockHabitLogFindMany: vi.fn(),
    mockHabitLogUpsert: vi.fn(),
  }))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    habit: { findMany: mockFindMany, create: mockCreate, findUnique: mockFindUnique, update: mockUpdate },
    habitLog: { findMany: mockHabitLogFindMany, upsert: mockHabitLogUpsert },
    $disconnect: vi.fn(),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  // Default: both habitLog.findMany calls (todayLogs + allLogs) return empty arrays
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

describe('GET /api/habits streak', () => {
  it('returns streak: 0 when there are no logs', async () => {
    const habit = { id: 1, name: 'Run', frequency: 'daily', active: true }
    mockFindMany.mockResolvedValue([habit])
    mockHabitLogFindMany.mockResolvedValue([])
    const res = await request(app).get('/api/habits')
    expect(res.status).toBe(200)
    expect(res.body[0].streak).toBe(0)
  })

  it('includes correct streak in the response for a daily habit', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterdayDate = new Date()
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1)
    const yesterday = yesterdayDate.toISOString().slice(0, 10)

    const habit = { id: 1, name: 'Run', frequency: 'daily', active: true }
    mockFindMany.mockResolvedValue([habit])
    // First call: today's completed logs
    mockHabitLogFindMany.mockResolvedValueOnce([{ habitId: 1 }])
    // Second call: all logs for streak calculation (2 consecutive days)
    mockHabitLogFindMany.mockResolvedValueOnce([
      { habitId: 1, date: today },
      { habitId: 1, date: yesterday },
    ])
    const res = await request(app).get('/api/habits')
    expect(res.status).toBe(200)
    expect(res.body[0].streak).toBe(2)
  })

  it('returns streak: 0 for weekly habits regardless of log entries', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const habit = { id: 1, name: 'Long run', frequency: 'weekly', active: true }
    mockFindMany.mockResolvedValue([habit])
    mockHabitLogFindMany.mockResolvedValueOnce([{ habitId: 1 }])
    mockHabitLogFindMany.mockResolvedValueOnce([{ habitId: 1, date: today }])
    const res = await request(app).get('/api/habits')
    expect(res.status).toBe(200)
    expect(res.body[0].streak).toBe(0)
  })
})

describe('GET /api/habits active filter', () => {
  it('returns only active habits by default', async () => {
    const active = { id: 1, name: 'Run', frequency: 'daily', active: true }
    mockFindMany.mockResolvedValue([active])
    const res = await request(app).get('/api/habits')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].active).toBe(true)
  })
})

describe('PUT /api/habits/:id', () => {
  it('updates habit name', async () => {
    const habit = { id: 1, name: 'Run', frequency: 'daily', active: true }
    const updated = { ...habit, name: 'Sprint' }
    mockFindUnique.mockResolvedValue(habit)
    mockUpdate.mockResolvedValue(updated)
    const res = await request(app).put('/api/habits/1').send({ name: 'Sprint' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Sprint')
  })

  it('updates habit frequency', async () => {
    const habit = { id: 1, name: 'Run', frequency: 'daily', active: true }
    const updated = { ...habit, frequency: 'weekly' }
    mockFindUnique.mockResolvedValue(habit)
    mockUpdate.mockResolvedValue(updated)
    const res = await request(app).put('/api/habits/1').send({ frequency: 'weekly' })
    expect(res.status).toBe(200)
    expect(res.body.frequency).toBe('weekly')
  })

  it('returns 404 when habit does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)
    const res = await request(app).put('/api/habits/999').send({ name: 'Sprint' })
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Habit not found')
  })

  it('returns 400 when id is not a number', async () => {
    const res = await request(app).put('/api/habits/abc').send({ name: 'Sprint' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid habit ID')
  })

  it('returns 400 when name is empty string', async () => {
    const res = await request(app).put('/api/habits/1').send({ name: '   ' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('name must be a non-empty string')
  })

  it('returns 400 when frequency is invalid', async () => {
    const res = await request(app).put('/api/habits/1').send({ frequency: 'monthly' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('frequency must be daily or weekly')
  })
})

describe('DELETE /api/habits/:id', () => {
  it('archives a habit by setting active to false', async () => {
    const habit = { id: 1, name: 'Run', frequency: 'daily', active: true }
    const archived = { ...habit, active: false }
    mockFindUnique.mockResolvedValue(habit)
    mockUpdate.mockResolvedValue(archived)
    const res = await request(app).delete('/api/habits/1')
    expect(res.status).toBe(200)
    expect(res.body.active).toBe(false)
  })

  it('returns 404 when habit does not exist', async () => {
    mockFindUnique.mockResolvedValue(null)
    const res = await request(app).delete('/api/habits/999')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Habit not found')
  })

  it('returns 400 when id is not a number', async () => {
    const res = await request(app).delete('/api/habits/abc')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid habit ID')
  })
})

describe('GET /api/export', () => {
  it('returns JSON with habits and completions by default', async () => {
    const habits = [{ id: 1, name: 'Run', frequency: 'daily', active: true, createdAt: new Date() }]
    const logs = [{ habitId: 1, date: '2024-01-01' }]
    mockFindMany.mockResolvedValue(habits)
    mockHabitLogFindMany.mockResolvedValue(logs)
    const res = await request(app).get('/api/export')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.body).toHaveProperty('habits')
    expect(res.body).toHaveProperty('completions')
    expect(res.body.habits).toHaveLength(1)
    expect(res.body.habits[0].name).toBe('Run')
    expect(res.body.completions).toHaveLength(1)
    expect(res.body.completions[0].habitId).toBe(1)
    expect(res.body.completions[0].date).toBe('2024-01-01')
  })

  it('returns JSON when format=json is specified', async () => {
    mockFindMany.mockResolvedValue([])
    mockHabitLogFindMany.mockResolvedValue([])
    const res = await request(app).get('/api/export?format=json')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/json/)
    expect(res.body).toHaveProperty('habits')
    expect(res.body).toHaveProperty('completions')
  })

  it('returns CSV with correct headers and rows when format=csv', async () => {
    const habits = [{ id: 1, name: 'Run', frequency: 'daily', active: true, createdAt: new Date() }]
    const logs = [{ habitId: 1, date: '2024-01-01' }]
    mockFindMany.mockResolvedValue(habits)
    mockHabitLogFindMany.mockResolvedValue(logs)
    const res = await request(app).get('/api/export?format=csv')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/csv/)
    const lines = (res.text as string).split('\n')
    expect(lines[0]).toBe('id,name,frequency,active,completionDate')
    expect(lines[1]).toBe('1,"Run",daily,true,2024-01-01')
  })

  it('includes a row with empty completionDate in CSV when habit has no logs', async () => {
    const habits = [{ id: 1, name: 'Rest', frequency: 'weekly', active: true, createdAt: new Date() }]
    mockFindMany.mockResolvedValue(habits)
    mockHabitLogFindMany.mockResolvedValue([])
    const res = await request(app).get('/api/export?format=csv')
    expect(res.status).toBe(200)
    const lines = (res.text as string).split('\n')
    expect(lines[0]).toBe('id,name,frequency,active,completionDate')
    expect(lines[1]).toBe('1,"Rest",weekly,true,')
  })

  it('escapes double-quotes in habit names in CSV output', async () => {
    const habits = [{ id: 1, name: 'My "Habit"', frequency: 'daily', active: true, createdAt: new Date() }]
    mockFindMany.mockResolvedValue(habits)
    mockHabitLogFindMany.mockResolvedValue([])
    const res = await request(app).get('/api/export?format=csv')
    expect(res.status).toBe(200)
    const lines = (res.text as string).split('\n')
    expect(lines[1]).toBe('1,"My ""Habit""",daily,true,')
  })

  it('returns multiple CSV rows when a habit has multiple completions', async () => {
    const habits = [{ id: 1, name: 'Run', frequency: 'daily', active: true, createdAt: new Date() }]
    const logs = [
      { habitId: 1, date: '2024-01-01' },
      { habitId: 1, date: '2024-01-02' },
    ]
    mockFindMany.mockResolvedValue(habits)
    mockHabitLogFindMany.mockResolvedValue(logs)
    const res = await request(app).get('/api/export?format=csv')
    expect(res.status).toBe(200)
    const lines = (res.text as string).split('\n')
    expect(lines).toHaveLength(3) // header + 2 data rows
    expect(lines[1]).toBe('1,"Run",daily,true,2024-01-01')
    expect(lines[2]).toBe('1,"Run",daily,true,2024-01-02')
  })

  it('sets Content-Disposition header for JSON download', async () => {
    mockFindMany.mockResolvedValue([])
    mockHabitLogFindMany.mockResolvedValue([])
    const res = await request(app).get('/api/export?format=json')
    expect(res.headers['content-disposition']).toMatch(/filename="habits\.json"/)
  })

  it('sets Content-Disposition header for CSV download', async () => {
    mockFindMany.mockResolvedValue([])
    mockHabitLogFindMany.mockResolvedValue([])
    const res = await request(app).get('/api/export?format=csv')
    expect(res.headers['content-disposition']).toMatch(/filename="habits\.csv"/)
  })
})

describe('GET /api/analytics', () => {
  it('returns zeros when there are no active habits', async () => {
    mockFindMany.mockResolvedValue([])
    mockHabitLogFindMany.mockResolvedValue([])
    const res = await request(app).get('/api/analytics')
    expect(res.status).toBe(200)
    expect(res.body.weeklyCompletionPct).toBe(0)
    expect(res.body.habitsCompletedThisWeek).toBe(0)
    expect(res.body.mostConsistentHabit).toBeNull()
  })

  it('returns correct weekly analytics when habits have logs this week', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const habits = [
      { id: 1, name: 'Run', frequency: 'daily', active: true },
      { id: 2, name: 'Read', frequency: 'daily', active: true },
    ]
    mockFindMany.mockResolvedValue(habits)
    mockHabitLogFindMany.mockResolvedValue([{ habitId: 1, date: today }])
    const res = await request(app).get('/api/analytics')
    expect(res.status).toBe(200)
    expect(res.body.weeklyCompletionPct).toBe(50)
    expect(res.body.habitsCompletedThisWeek).toBe(1)
    expect(res.body.mostConsistentHabit).toBe('Run')
  })

  it('returns 100% when all habits are completed this week', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const habits = [
      { id: 1, name: 'Run', frequency: 'daily', active: true },
      { id: 2, name: 'Read', frequency: 'daily', active: true },
    ]
    mockFindMany.mockResolvedValue(habits)
    mockHabitLogFindMany.mockResolvedValue([
      { habitId: 1, date: today },
      { habitId: 2, date: today },
    ])
    const res = await request(app).get('/api/analytics')
    expect(res.status).toBe(200)
    expect(res.body.weeklyCompletionPct).toBe(100)
    expect(res.body.habitsCompletedThisWeek).toBe(2)
  })
})
