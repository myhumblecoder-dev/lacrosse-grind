import { describe, it, expect } from 'vitest'
import { SEASON_START, SEASON_WEEKS, getSeasonWeeks, getSeasonEnd } from './season'

describe('season', () => {
  it('getSeasonWeeks returns 13 dates and the first equals SEASON_START', () => {
    const weeks = getSeasonWeeks()
    expect(weeks).toHaveLength(SEASON_WEEKS)
    expect(weeks[0].getTime()).toBe(SEASON_START.getTime())
  })

  it('every consecutive pair in getSeasonWeeks is exactly 7 days apart', () => {
    const weeks = getSeasonWeeks()
    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000

    for (let i = 0; i < weeks.length - 1; i++) {
      const diff = weeks[i + 1].getTime() - weeks[i].getTime()
      expect(diff).toBe(MS_PER_WEEK)
    }
  })

  it('getSeasonEnd is 91 days after SEASON_START', () => {
    const end = getSeasonEnd()
    const MS_PER_DAY = 24 * 60 * 60 * 1000
    const expectedDiff = 91 * MS_PER_DAY
    
    const actualDiff = end.getTime() - SEASON_START.getTime()
    expect(actualDiff).toBe(expectedDiff)
  })
})
