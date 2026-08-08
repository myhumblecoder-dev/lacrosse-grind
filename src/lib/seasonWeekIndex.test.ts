import { describe, it, expect } from 'vitest'
import { getSeasonWeekIndex } from './seasonWeekIndex'

/**
 * The season is defined as 2026-08-10 to 2026-11-09.
 * We use UTC dates to ensure test stability across environments.
 */

describe('seasonWeekIndex', () => {
  it('a date inside the first season week returns 1', () => {
    // The season starts 2026-08-10. 
    // A date like 2026-08-12 is clearly within the first week.
    const date = new Date('2026-08-12T00:00:00.000Z')
    const index = getSeasonWeekIndex(date)
    expect(index).toBe(1)
  })

  it('a date before the season starts returns null', () => {
    // 2026-08-09 is one day before the season start.
    const date = new Date('2026-08-09T00:00:00.000Z')
    const index = getSeasonWeekIndex(date)
    expect(index).toBeNull()
  })

  it('a date after the season ends returns null', () => {
    // The season ends 2026-11-09. 
    // A date on or after the end date should return null.
    const date = new Date('2026-11-10T00:00:00.000Z')
    const index = getSeasonWeekIndex(date)
    expect(index).toBeNull()
  })
})
