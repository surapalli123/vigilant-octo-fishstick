/**
 * Calculates the current streak for a daily habit.
 *
 * The streak counts consecutive completed days going backward from today.
 * If today has no log entry, the count starts from yesterday instead (so an
 * in-progress day does not reset an active streak).  If neither today nor
 * yesterday has a log entry the streak is 0.
 *
 * Weekly habits are not supported by this function; callers should pass
 * frequency = 'weekly' and use 0 as a documented fallback.
 *
 * @param dates - Array of ISO date strings (YYYY-MM-DD) when the habit was completed.
 * @param today - Today's date as an ISO date string (YYYY-MM-DD).
 * @returns The current streak count (≥ 0).
 */
export function calculateDailyStreak(dates: string[], today: string): number {
  if (dates.length === 0) return 0

  const dateSet = new Set(dates)

  const todayDate = new Date(today + 'T00:00:00Z')
  const yesterdayDate = new Date(todayDate)
  yesterdayDate.setUTCDate(todayDate.getUTCDate() - 1)
  const yesterday = yesterdayDate.toISOString().slice(0, 10)

  let startDate: string
  if (dateSet.has(today)) {
    startDate = today
  } else if (dateSet.has(yesterday)) {
    startDate = yesterday
  } else {
    return 0
  }

  let streak = 0
  const current = new Date(startDate + 'T00:00:00Z')

  while (dateSet.has(current.toISOString().slice(0, 10))) {
    streak++
    current.setUTCDate(current.getUTCDate() - 1)
  }

  return streak
}
