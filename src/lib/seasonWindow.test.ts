import { describe, it, expect } from 'vitest'
import { getSeasonWeeksFrom } from './seasonWindow'
import { SEASON_WEEKS } from '@/lib/season'

describe('seasonWindow', () => {
  it('returns thirteen weeks starting at the given date', () => {
    const start = new Date(Date.UTC(2024, 0, 1))
    const weeks = getSeasonWeeksFrom(start)
    
    expect(weeks).toHaveLength(SEASON_WEEKS)
  })

  it('each week is exactly seven days after the previous', () => {
    const start = new Date(Date.UTC(2024, 5, 15))
    const weeks = getSeasonWeeksFrom(start)

    for (let i = 1; i < weeks.length; i++) {
      const prev = weeks[i - 1].getTime()
      const current = weeks[i].getTime()
      const diffInMs = current - prev
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
      
      expect(diffInMs).toBe(sevenDaysInMs)
    }
  })

  it('a different start date shifts every week', () => {
    const startA = new Date(Date.UTC(2024, 0, 1))
    const startB = new Date(Date.UTC(2024, 0, 8))
    
    const weeksA = getSeasonWeeksFrom(startA)
    const weeksB = getSeasonWeeksFrom(startB)

    // The first week of A should be different from the first week of B
    expect(weeksA[0].getTime()).not.toBe(weeksB[0].getTime())
    // The second week of A should be the first week of B
    expect(weeksA[1].getTime()).toBe(weeksB[0].getTime())
  })
})
