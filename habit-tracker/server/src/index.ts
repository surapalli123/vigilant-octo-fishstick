import express from 'express'
import { PrismaClient } from '@prisma/client'
import { calculateDailyStreak } from './streak'
import { calculateWeeklyAnalytics, getWeekStart } from './analytics'

const app = express()
const PORT = process.env.PORT ?? 3001

const prisma = new PrismaClient()

app.use(express.json())

const getCurrentDateString = () => new Date().toISOString().slice(0, 10)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/habits', async (req, res) => {
  try {
    const today = getCurrentDateString()
    const includeArchived = req.query.includeArchived === 'true'
    const habits = await prisma.habit.findMany({
      where: includeArchived ? undefined : { active: true },
      orderBy: { createdAt: 'desc' },
    })
    const todayLogs = await prisma.habitLog.findMany({
      where: { date: today },
      select: { habitId: true },
    })
    const completedIds = new Set(todayLogs.map((log: { habitId: number }) => log.habitId))

    const allLogs = await prisma.habitLog.findMany({
      select: { habitId: true, date: true },
    })
    const logsByHabit = new Map<number, string[]>()
    for (const log of allLogs as Array<{ habitId: number; date: string }>) {
      if (!log.date) continue
      const existing = logsByHabit.get(log.habitId) ?? []
      existing.push(log.date)
      logsByHabit.set(log.habitId, existing)
    }

    const result = habits.map((habit: { id: number; frequency: string; [key: string]: unknown }) => ({
      ...habit,
      completedToday: completedIds.has(habit.id),
      streak: habit.frequency === 'daily'
        ? calculateDailyStreak(logsByHabit.get(habit.id) ?? [], today)
        : 0,
    }))
    res.json(result)
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

app.post('/api/habits/:id/complete', async (req, res) => {
  const habitId = parseInt(req.params.id, 10)
  if (isNaN(habitId)) {
    res.status(400).json({ error: 'Invalid habit ID' })
    return
  }

  const today = getCurrentDateString()

  try {
    const habit = await prisma.habit.findUnique({ where: { id: habitId } })
    if (!habit) {
      res.status(404).json({ error: 'Habit not found' })
      return
    }

    const log = await prisma.habitLog.upsert({
      where: { habitId_date: { habitId, date: today } },
      update: {},
      create: { habitId, date: today },
    })
    res.status(201).json(log)
  } catch {
    res.status(500).json({ error: 'Failed to record completion' })
  }
})

app.put('/api/habits/:id', async (req, res) => {
  const habitId = parseInt(req.params.id, 10)
  if (isNaN(habitId)) {
    res.status(400).json({ error: 'Invalid habit ID' })
    return
  }

  const { name, frequency } = req.body as { name?: unknown; frequency?: unknown }

  if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
    res.status(400).json({ error: 'name must be a non-empty string' })
    return
  }

  if (frequency !== undefined && frequency !== 'daily' && frequency !== 'weekly') {
    res.status(400).json({ error: 'frequency must be daily or weekly' })
    return
  }

  try {
    const existing = await prisma.habit.findUnique({ where: { id: habitId } })
    if (!existing) {
      res.status(404).json({ error: 'Habit not found' })
      return
    }

    const updated = await prisma.habit.update({
      where: { id: habitId },
      data: {
        ...(name !== undefined ? { name: (name as string).trim() } : {}),
        ...(frequency !== undefined ? { frequency: frequency as string } : {}),
      },
    })
    res.json(updated)
  } catch {
    res.status(500).json({ error: 'Failed to update habit' })
  }
})

app.delete('/api/habits/:id', async (req, res) => {
  const habitId = parseInt(req.params.id, 10)
  if (isNaN(habitId)) {
    res.status(400).json({ error: 'Invalid habit ID' })
    return
  }

  try {
    const existing = await prisma.habit.findUnique({ where: { id: habitId } })
    if (!existing) {
      res.status(404).json({ error: 'Habit not found' })
      return
    }

    const archived = await prisma.habit.update({
      where: { id: habitId },
      data: { active: false },
    })
    res.json(archived)
  } catch {
    res.status(500).json({ error: 'Failed to archive habit' })
  }
})

app.get('/api/analytics', async (_req, res) => {
  try {
    const today = getCurrentDateString()
    const habits = await prisma.habit.findMany({
      where: { active: true },
      select: { id: true, name: true },
    })
    const weekStart = getWeekStart(today)
    const weekLogs = await prisma.habitLog.findMany({
      where: { date: { gte: weekStart, lte: today } },
      select: { habitId: true, date: true },
    })
    const analytics = calculateWeeklyAnalytics(habits, weekLogs, today)
    res.json(analytics)
  } catch {
    res.status(500).json({ error: 'Failed to fetch analytics' })
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
