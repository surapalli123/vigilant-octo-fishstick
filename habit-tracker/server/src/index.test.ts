import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from './index'

const { mockFindMany, mockCreate } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCreate: vi.fn(),
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    habit: { findMany: mockFindMany, create: mockCreate },
    $disconnect: vi.fn(),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
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
