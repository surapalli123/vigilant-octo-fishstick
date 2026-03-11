import { describe, it, expect } from 'vitest'
import { calculateDailyStreak } from './streak'

const TODAY = '2024-06-15'
const YESTERDAY = '2024-06-14'

describe('calculateDailyStreak', () => {
  it('returns 0 for an empty log', () => {
    expect(calculateDailyStreak([], TODAY)).toBe(0)
  })

  it('returns 1 when only today is completed', () => {
    expect(calculateDailyStreak([TODAY], TODAY)).toBe(1)
  })

  it('returns 1 when only yesterday is completed', () => {
    expect(calculateDailyStreak([YESTERDAY], TODAY)).toBe(1)
  })

  it('returns 0 when the most recent completion was two days ago', () => {
    expect(calculateDailyStreak(['2024-06-13'], TODAY)).toBe(0)
  })

  it('returns 3 for three consecutive days ending today', () => {
    expect(calculateDailyStreak(['2024-06-13', YESTERDAY, TODAY], TODAY)).toBe(3)
  })

  it('returns 2 for two consecutive days ending yesterday', () => {
    expect(calculateDailyStreak(['2024-06-13', YESTERDAY], TODAY)).toBe(2)
  })

  it('handles a gap in logs — streak breaks at the gap', () => {
    // Today and two days ago are completed but yesterday is missing → streak is 1
    expect(calculateDailyStreak(['2024-06-13', TODAY], TODAY)).toBe(1)
  })

  it('ignores future dates', () => {
    // A future date should not extend the streak backwards
    expect(calculateDailyStreak(['2024-06-16', TODAY], TODAY)).toBe(1)
  })

  it('returns 0 when the log is entirely in the past with a gap', () => {
    expect(calculateDailyStreak(['2024-06-10', '2024-06-11'], TODAY)).toBe(0)
  })

  it('handles a long streak of 7 consecutive days ending today', () => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(TODAY + 'T00:00:00Z')
      d.setUTCDate(d.getUTCDate() - i)
      return d.toISOString().slice(0, 10)
    })
    expect(calculateDailyStreak(dates, TODAY)).toBe(7)
  })
})
