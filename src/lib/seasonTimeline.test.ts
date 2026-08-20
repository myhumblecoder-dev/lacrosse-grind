import { describe, it, expect } from 'vitest'
import { describeSeason } from './seasonTimeline'

const FRIDAY = new Date('2026-08-14T21:30:00.000Z')
const MONDAY = new Date('2026-08-17T08:00:00.000Z')

describe('describeSeason', () => {
  it('tells Eddie when a season WOULD start before he commits', () => {
    // Friday night, nothing pressed yet.
    const s = describeSeason(null, FRIDAY)

    expect(s.phase).toBe('not-started')
    expect(s.startsOn.toISOString()).toBe('2026-08-17T00:00:00.000Z')
    expect(s.endsOn.toISOString()).toBe('2026-11-16T00:00:00.000Z')
  })

  it('says the season is scheduled once he presses, before it begins', () => {
    // The gap that makes START feel broken: pressed on Friday, begins Monday.
    const s = describeSeason(new Date('2026-08-17T00:00:00.000Z'), FRIDAY)

    expect(s.phase).toBe('scheduled')
    expect(s.startsOn.toISOString()).toBe('2026-08-17T00:00:00.000Z')
    expect(s.weekNumber).toBeNull()
  })

  it('counts the week once the season is running', () => {
    const s = describeSeason(new Date('2026-08-17T00:00:00.000Z'), MONDAY)

    expect(s.phase).toBe('running')
    expect(s.weekNumber).toBe(1)
  })

  it('counts a later week correctly', () => {
    const week3 = new Date('2026-08-31T12:00:00.000Z')
    expect(describeSeason(new Date('2026-08-17T00:00:00.000Z'), week3).weekNumber).toBe(3)
  })

  it('knows when the season is over', () => {
    const after = new Date('2026-11-17T00:00:00.000Z')
    const s = describeSeason(new Date('2026-08-17T00:00:00.000Z'), after)

    expect(s.phase).toBe('ended')
    expect(s.weekNumber).toBeNull()
  })

  it('reports the last day of the final week, not the day it rolls over', () => {
    const s = describeSeason(null, FRIDAY)
    // 13 weeks from Mon 17 Aug: the season is done at the end of Sun 15 Nov.
    expect(s.lastDay.toISOString()).toBe('2026-11-15T00:00:00.000Z')
  })
})
