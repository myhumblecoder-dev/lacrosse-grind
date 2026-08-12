import { describe, it, expect } from 'vitest'
import { getSeasonProgress } from './seasonProgress'
import { SEASON_WEEKS, WEEKS_REQUIRED, SEASON_START } from '@/lib/season'

describe('seasonProgress', () => {
  it('a null seasonStart reports zero qualified and earned false', () => {
    const lanes: Array<any> = [
      {
        targetPerWeek: 1,
        checkIns: []
      }
    ]
    const today = new Date(Date.UTC(2099, 0, 1))
    const progress = getSeasonProgress(lanes, today, null as any)

    expect(progress.qualified).toBe(0)
    expect(progress.earned).toBe(false)
  })

  it('a null seasonStart leaves every allowed miss remaining', () => {
    const lanes: Array<any> = [
      {
        targetPerWeek: 1,
        checkIns: []
      }
    ]
    const today = new Date(Date.UTC(2099, 0, 1))
    const progress = getSeasonProgress(lanes, today, null as any)
    
    const missedAllowed = SEASON_WEEKS - WEEKS_REQUIRED
    expect(progress.missesRemaining).toBe(missedAllowed)
  })

  it('omitting the third argument still uses the season constant', () => {
    const lanes: Array<any> = [
      {
        targetPerWeek: 1,
        checkIns: []
      }
    ]
    const today = new Date(Date.UTC(2099, 0, 1))
    const progress = getSeasonProgress(lanes, today)

    // If it uses the constant, the weeks array should be populated based on SEASON_START
    // We check if the first week's start date matches the year of SEASON_START
    expect(progress.weeks.length).toBeGreaterThan(0)
    expect(progress.weeks[0].weekStart.getUTCFullYear()).toBe(SEASON_START.getUTCFullYear())
  })
})
