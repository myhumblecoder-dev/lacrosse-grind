import { describe, it, expect } from 'vitest'
import { getSeasonProgress } from './seasonProgress'
import { SEASON_WEEKS, WEEKS_REQUIRED } from '@/lib/season'

describe('seasonProgress', () => {
  it('missesAllowed is the difference between SEASON_WEEKS and WEEKS_REQUIRED', () => {
    const lanes: Array<any> = []
    const today = new Date('2026-11-30T00:00:00.000Z')
    const progress = getSeasonProgress(lanes, today)
    
    expect(progress.missedAllowed).toBe(SEASON_WEEKS - WEEKS_REQUIRED)
  })

  it('an empty lanes array with a today after the season end leaves qualified at 0 and earned false', () => {
    const lanes: Array<any> = []
    const today = new Date('2026-11-30T00:00:00.000Z')
    const progress = getSeasonProgress(lanes, today)
    
    expect(progress.qualified).toBe(0)
    expect(progress.earned).toBe(false)
  })

  it('an empty lanes array with a today after the season end floors missesRemaining at 0', () => {
    const lanes: Array<any> = []
    const today = new Date('2026-11-30T00:00:00.000Z')
    const progress = getSeasonProgress(lanes, today)
    
    expect(progress.missesRemaining).toBe(0)
  })
})
