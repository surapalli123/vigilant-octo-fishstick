import express from 'express'
import { PrismaClient } from '@prisma/client'

const app = express()
const PORT = process.env.PORT ?? 3001

const prisma = new PrismaClient()

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/habits', async (_req, res) => {
  try {
    const habits = await prisma.habit.findMany({ orderBy: { createdAt: 'desc' } })
    res.json(habits)
  } catch {
    res.status(500).json({ error: 'Failed to fetch habits' })
  }
})

app.post('/api/habits', async (req, res) => {
  const { name, frequency, active } = req.body as {
    name?: unknown
    frequency?: unknown
    active?: unknown
  }

  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'name is required' })
    return
  }

  if (frequency !== undefined && frequency !== 'daily' && frequency !== 'weekly') {
    res.status(400).json({ error: 'frequency must be daily or weekly' })
    return
  }

  const freq = frequency === 'weekly' ? 'weekly' : 'daily'
  const isActive = active === undefined ? true : Boolean(active)

  try {
    const habit = await prisma.habit.create({
      data: { name: name.trim(), frequency: freq, active: isActive },
    })
    res.status(201).json(habit)
  } catch {
    res.status(500).json({ error: 'Failed to create habit' })
  }
})

export { app, prisma }

// Only start the server when this file is run directly (not during tests)
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`)
  })

  const shutdown = () => {
    server.close(() => {
      void prisma.$disconnect().then(() => process.exit(0))
    })
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}
