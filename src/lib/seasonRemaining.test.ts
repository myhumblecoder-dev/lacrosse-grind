import { describe, it, expect } from 'vitest'
import { weeksRemaining } from './seasonRemaining'

/**
 * The season is defined as 2026-08-10 to 2026-11-09.
 * getSeasonWeeks() returns the start dates of the weeks in the season.
 * Based on the AC, there are 13 weeks total in the season.
 */

describe('seasonRemaining', () => {
  it('a date before the season begins returns thirteen', () => {
    // Before the first week start (2026-08-10)
    const beforeSeason = new Date('2026-08-01T00:00:00.000Z')
    expect(weeksRemaining(beforeSeason)).toBe(13)
  })

  it('a date after the final week start returns zero', () => {
    // After the last week start (the last week starts on 2026-11-02 if 13 weeks total)
    // We use a date clearly after the season end
    const afterSeason = new Date('2026-11-15T00:00:00.000Z')
    expect(weeksRemaining(afterSeason)).toBe(0)
  })

  it('a date inside the second week returns eleven, excluding the week already under way', () => {
    // Week 1 starts 2026-08-10. Week 2 starts 2026-08-17.
    // If today is 2026-08-18, we are inside the second week.
    // The weeks remaining should be the weeks starting AFTER 2026-08-18.
    // Total weeks: 13. Weeks passed/underway: Week 1 and Week 2.
    // Remaining: 13 - 2 = 11.
    const insideSecondWeek = new Date('2026-08-18T00:00:00.000Z')
    expect(weeksRemaining(insideSecondWeek)).toBe(11)
  })

  it('excluding the week already under way', () => {
    // If today is exactly the start of the second week (2026-08-17),
    // the week is 'under way' and should not be counted.
    // Remaining should still be 11.
    const startOfSecondWeek = new Date('2026-08-17T00:00:00.000Z')
    expect(weeksRemaining(startOfSecondWeek)).toBe(11)
  })
})
