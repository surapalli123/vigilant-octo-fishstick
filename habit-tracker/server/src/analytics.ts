/**
 * Returns the Monday (start) of the ISO week that contains the given date.
 *
 * @param today - Today's date as an ISO date string (YYYY-MM-DD).
 * @returns The Monday of the current week as an ISO date string.
 */
export function getWeekStart(today: string): string {
  const d = new Date(today + 'T00:00:00Z')
  const day = d.getUTCDay() // 0 = Sunday, 1 = Monday … 6 = Saturday
  const diff = day === 0 ? 6 : day - 1 // days since Monday
  d.setUTCDate(d.getUTCDate() - diff)
  return d.toISOString().slice(0, 10)
}

export interface WeeklyAnalytics {
  weeklyCompletionPct: number
  mostConsistentHabit: string | null
  habitsCompletedThisWeek: number
}

/**
 * Calculates weekly analytics for a set of habits.
 *
 * "This week" spans from Monday of the current ISO week through today.
 *
 * @param habits - Active habits (must include id and name).
 * @param logs   - Habit log entries (must include habitId and date).
 * @param today  - Today's date as an ISO date string (YYYY-MM-DD).
 * @returns Weekly analytics: completion percentage, most consistent habit, habits completed count.
 */
export function calculateWeeklyAnalytics(
  habits: Array<{ id: number; name: string }>,
  logs: Array<{ habitId: number; date: string }>,
  today: string,
): WeeklyAnalytics {
  if (habits.length === 0) {
    return { weeklyCompletionPct: 0, mostConsistentHabit: null, habitsCompletedThisWeek: 0 }
  }

  const weekStart = getWeekStart(today)
  const habitIds = new Set(habits.map((h) => h.id))

  // Keep only logs within the current week and for active habits
  const weekLogs = logs.filter(
    (log) => log.date >= weekStart && log.date <= today && habitIds.has(log.habitId),
  )

  // Count completions per habit this week
  const completionsByHabit = new Map<number, number>()
  for (const log of weekLogs) {
    completionsByHabit.set(log.habitId, (completionsByHabit.get(log.habitId) ?? 0) + 1)
  }

  const habitsCompletedThisWeek = completionsByHabit.size
  const weeklyCompletionPct = Math.round((habitsCompletedThisWeek / habits.length) * 100)

  // Identify the habit with the highest completion count this week
  let mostConsistentHabit: string | null = null
  let maxCompletions = 0
  for (const [habitId, count] of completionsByHabit) {
    if (count > maxCompletions) {
      maxCompletions = count
      const habit = habits.find((h) => h.id === habitId)
      mostConsistentHabit = habit?.name ?? null
    }
  }

  return { weeklyCompletionPct, mostConsistentHabit, habitsCompletedThisWeek }
}
