import { describe, it, expect } from 'vitest'
import { getSeasonProgress } from './seasonProgress'
import {SEASON_WEEKS, WEEKS_REQUIRED } from '@/lib/season'

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
})

describe('seasonProgress — a target raised mid-season', () => {
  const SEASON_START = new Date(Date.UTC(2026, 5, 1)) // Monday 1 Jun 2026
  const WEEK_2 = new Date(Date.UTC(2026, 5, 8))
  const TODAY = new Date(Date.UTC(2026, 5, 22)) // during week 4

  // Three lanes that each hit 3 days in weeks 1 and 2 — enough for a target of
  // three, not enough for a target of five.
  const laneHitting3 = (targetChanges: any[] = []) => ({
    targetPerWeek: 3,
    targetChanges,
    checkIns: [
      { date: new Date(Date.UTC(2026, 5, 1)), isRest: false },
      { date: new Date(Date.UTC(2026, 5, 2)), isRest: false },
      { date: new Date(Date.UTC(2026, 5, 3)), isRest: false },
      { date: new Date(Date.UTC(2026, 5, 8)), isRest: false },
      { date: new Date(Date.UTC(2026, 5, 9)), isRest: false },
      { date: new Date(Date.UTC(2026, 5, 10)), isRest: false },
    ],
  })

  it('leaves already-earned weeks qualified', () => {
    const before = getSeasonProgress(
      [laneHitting3(), laneHitting3(), laneHitting3()],
      TODAY,
      SEASON_START
    )

    // Raising every lane to 5×/week from week 4 onward.
    const raiseFrom = new Date(Date.UTC(2026, 5, 22))
    const change = [{ target: 5, effectiveFrom: raiseFrom }]
    const after = getSeasonProgress(
      [laneHitting3(change), laneHitting3(change), laneHitting3(change)],
      TODAY,
      SEASON_START
    )

    expect(before.qualified).toBe(2)
    expect(after.qualified).toBe(2)
  })

  it('would have un-qualified those weeks if the target applied retroactively', () => {
    // Proves the guard is load-bearing: back-dating the same change to the
    // season start does drop both weeks, which is exactly what a plain
    // mutable targetPerWeek used to do on every edit.
    const backdated = [{ target: 5, effectiveFrom: SEASON_START }]
    const retro = getSeasonProgress(
      [laneHitting3(backdated), laneHitting3(backdated), laneHitting3(backdated)],
      TODAY,
      SEASON_START
    )

    expect(retro.qualified).toBe(0)
  })

  it('scores the week a change takes effect at the new target', () => {
    const change = [{ target: 5, effectiveFrom: WEEK_2 }]
    const progress = getSeasonProgress(
      [laneHitting3(change), laneHitting3(change), laneHitting3(change)],
      TODAY,
      SEASON_START
    )

    // Week 1 still qualifies at 3; week 2 now needs 5 and only has 3.
    expect(progress.qualified).toBe(1)
  })
})
