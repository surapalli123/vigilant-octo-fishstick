import { describe, it, expect } from 'vitest'
import { getWeekStart, calculateWeeklyAnalytics } from './analytics'

describe('getWeekStart', () => {
  it('returns the same day when today is Monday', () => {
    expect(getWeekStart('2024-01-08')).toBe('2024-01-08') // Jan 8 2024 is a Monday
  })

  it('returns the previous Monday when today is Sunday', () => {
    expect(getWeekStart('2024-01-14')).toBe('2024-01-08') // Jan 14 2024 is a Sunday
  })

  it('returns the previous Monday when today is Wednesday', () => {
    expect(getWeekStart('2024-01-10')).toBe('2024-01-08') // Jan 10 2024 is a Wednesday
  })

  it('returns the previous Monday when today is Saturday', () => {
    expect(getWeekStart('2024-01-13')).toBe('2024-01-08') // Jan 13 2024 is a Saturday
  })
})

describe('calculateWeeklyAnalytics', () => {
  it('returns zeros when there are no habits', () => {
    const result = calculateWeeklyAnalytics([], [], '2024-01-10')
    expect(result).toEqual({
      weeklyCompletionPct: 0,
      mostConsistentHabit: null,
      habitsCompletedThisWeek: 0,
    })
  })

  it('returns zeros when habits exist but there are no logs this week', () => {
    const habits = [
      { id: 1, name: 'Run' },
      { id: 2, name: 'Read' },
    ]
    const result = calculateWeeklyAnalytics(habits, [], '2024-01-10')
    expect(result).toEqual({
      weeklyCompletionPct: 0,
      mostConsistentHabit: null,
      habitsCompletedThisWeek: 0,
    })
  })

  it('counts only habits completed at least once this week', () => {
    const habits = [
      { id: 1, name: 'Run' },
      { id: 2, name: 'Read' },
      { id: 3, name: 'Meditate' },
    ]
    const logs = [
      { habitId: 1, date: '2024-01-08' },
      { habitId: 1, date: '2024-01-09' },
      { habitId: 2, date: '2024-01-10' },
      // habit 3 has no completions this week
    ]
    const result = calculateWeeklyAnalytics(habits, logs, '2024-01-10')
    expect(result.habitsCompletedThisWeek).toBe(2)
  })

  it('calculates weekly completion percentage correctly', () => {
    const habits = [
      { id: 1, name: 'Run' },
      { id: 2, name: 'Read' },
    ]
    const logs = [{ habitId: 1, date: '2024-01-08' }]
    const result = calculateWeeklyAnalytics(habits, logs, '2024-01-10')
    expect(result.weeklyCompletionPct).toBe(50)
  })

  it('returns 100% when all habits have been completed this week', () => {
    const habits = [
      { id: 1, name: 'Run' },
      { id: 2, name: 'Read' },
    ]
    const logs = [
      { habitId: 1, date: '2024-01-08' },
      { habitId: 2, date: '2024-01-09' },
    ]
    const result = calculateWeeklyAnalytics(habits, logs, '2024-01-10')
    expect(result.weeklyCompletionPct).toBe(100)
  })

  it('identifies the most consistent habit by completion count', () => {
    const habits = [
      { id: 1, name: 'Run' },
      { id: 2, name: 'Read' },
    ]
    const logs = [
      { habitId: 1, date: '2024-01-08' },
      { habitId: 1, date: '2024-01-09' },
      { habitId: 2, date: '2024-01-10' },
    ]
    const result = calculateWeeklyAnalytics(habits, logs, '2024-01-10')
    expect(result.mostConsistentHabit).toBe('Run')
  })

  it('excludes logs from previous weeks', () => {
    const habits = [{ id: 1, name: 'Run' }]
    // Jan 1 2024 is in the previous week (week of Dec 25 - Jan 1)
    const logs = [{ habitId: 1, date: '2024-01-01' }]
    const result = calculateWeeklyAnalytics(habits, logs, '2024-01-10')
    expect(result.habitsCompletedThisWeek).toBe(0)
    expect(result.weeklyCompletionPct).toBe(0)
    expect(result.mostConsistentHabit).toBeNull()
  })

  it('excludes logs for habits not in the active habits list', () => {
    const habits = [{ id: 1, name: 'Run' }]
    const logs = [{ habitId: 2, date: '2024-01-10' }] // habit 2 not in active list
    const result = calculateWeeklyAnalytics(habits, logs, '2024-01-10')
    expect(result.habitsCompletedThisWeek).toBe(0)
  })

  it('excludes future logs (after today) from the weekly count', () => {
    const habits = [{ id: 1, name: 'Run' }]
    const logs = [{ habitId: 1, date: '2024-01-11' }] // tomorrow
    const result = calculateWeeklyAnalytics(habits, logs, '2024-01-10')
    expect(result.habitsCompletedThisWeek).toBe(0)
  })
})
