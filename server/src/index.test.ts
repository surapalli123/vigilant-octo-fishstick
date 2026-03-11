import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from './index'

describe('GET /health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('GET /api/habits', () => {
  it('returns an empty array initially', async () => {
    const res = await request(app).get('/api/habits')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
