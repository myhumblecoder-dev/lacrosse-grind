import { describe, it, expect } from 'vitest'
import { computeStreak } from './streak'

describe('streak', () => {
  // Helper to create UTC dates to ensure timezone independence
  const createUTCDate = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d))

  it('empty array returns zero', () => {
    const today = createUTCDate(2023, 10, 10)
    const checkIns: { date: Date; isRest: boolean }[] = []
    expect(computeStreak(checkIns, today)).toBe(0)
  })

  it('single hit today returns one', () => {
    const today = createUTCDate(2023, 10, 10)
    const checkIns: { date: Date; isRest: boolean }[] = [
      { date: createUTCDate(2023, 10, 10), isRest: false }
    ]
    expect(computeStreak(checkIns, today)).toBe(1)
  })

  it('three consecutive days returns three', () => {
    const today = createUTCDate(2023, 10, 10)
    const checkIns: { date: Date; isRest: boolean }[] = [
      { date: createUTCDate(2023, 10, 10), isRest: false },
      { date: createUTCDate(2023, 10, 9), isRest: false },
      { date: createUTCDate(2023, 10, 8), isRest: false },
    ]
    expect(computeStreak(checkIns, today)).toBe(3)
  })

  it('gap breaks streak', () => {
    const today = createUTCDate(2023, 10, 10)
    const checkIns: { date: Date; isRest: boolean }[] = [
      { date: createUTCDate(2023, 10, 10), isRest: false },
      { date: createUTCDate(2023, 10, 9), isRest: false },
      // Gap on Oct 8
      { date: createUTCDate(2023, 10, 7), isRest: false },
    ]
    expect(computeStreak(checkIns, today)).toBe(2)
  })

  it('rest day counts as hit', () => {
    const today = createUTCDate(2023, 10, 10)
    const checkIns: { date: Date; isRest: boolean }[] = [
      { date: createUTCDate(2023, 10, 10), isRest: false },
      { date: createUTCDate(2000, 1, 1), isRest: true }, // A rest day from long ago
      { date: createUTCDate(2023, 10, 9), isRest: true },
    ]
    // Oct 10 (hit), Oct 9 (rest hit), Oct 8 (missing) -> streak 2
    expect(computeStreak(checkIns, today)).toBe(2)
  })

  it('no hit today returns zero', () => {
    const today = createUTCDate(2023, 10, 10)
    const checkIns: { date: Date; isRest: boolean }[] = [
      { date: createUTCDate(2023, 10, 9), isRest: false },
      { date: createUTCDate(2023, 10, 8), isRest: false },
    ]
    expect(computeStreak(checkIns, today)).toBe(0)
  })

  it('inputs are not mutated', () => {
    const date = createUTCDate(2023, 10, 10)
    const originalTime = date.getTime()
    const today = createUTCDate(2023, 10, 10)
    const checkIns: { date: Date; isRest: boolean }[] = [
      { date: new Date(date.getTime()), isRest: false }
    ]

    computeStreak(checkIns, today)

    expect(checkIns[0].date.getTime()).toBe(originalTime)
    expect(checkIns[0].date.getUTCHours()).toBe(0)
    expect(checkIns[0].date.getUTCMinutes()).toBe(0)
  })

  it('streak counts UTC-midnight days', () => {
    // Create a date that is NOT midnight UTC (e.g., 11 PM UTC on the previous day)
    // If the function uses local setHours, this might shift to a different day in some timezones
    const yesterdayLate = new Date(Date.UTC(2023, 9, 9, 23, 0, 0))
    const todayMidnight = new Date(Date.UTC(2023, 9, 10, 0, 0, 0))
    
    const checkIns: { date: Date; isRest: boolean }[] = [
      { date: yesterdayLate, isRest: false },
      { date: todayMidnight, isRest: false }
    ]
    
    // If normalized correctly to UTC midnight, yesterdayLate becomes Oct 9 00:00 UTC
    // and todayMidnight is Oct 10 00:00 UTC. Streak should be 2.
    expect(computeStreak(checkIns, todayMidnight)).toBe(2)
  })
})
describe('streak — freezes bridge a missed day', () => {
  const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m, day))

  it('a frozen day joins the run either side of it', () => {
    const today = d(2023, 10, 10)
    const checkIns = [
      { date: d(2023, 10, 10), isRest: false },
      // Oct 9 missed, covered by a freeze
      { date: d(2023, 10, 8), isRest: false },
      { date: d(2023, 10, 7), isRest: false },
    ]

    expect(computeStreak(checkIns, today)).toBe(1)
    expect(computeStreak(checkIns, today, [d(2023, 10, 9)])).toBe(4)
  })

  it('the frozen day itself counts — a banked miss is guilt-free, not free', () => {
    const today = d(2023, 10, 10)
    const checkIns = [
      { date: d(2023, 10, 10), isRest: false },
      { date: d(2023, 10, 8), isRest: false },
    ]

    // Oct 10 + frozen Oct 9 + Oct 8
    expect(computeStreak(checkIns, today, [d(2023, 10, 9)])).toBe(3)
  })

  it('two freezes bridge two missed days in a row', () => {
    const today = d(2023, 10, 10)
    const checkIns = [
      { date: d(2023, 10, 10), isRest: false },
      { date: d(2023, 10, 7), isRest: false },
    ]

    expect(computeStreak(checkIns, today, [d(2023, 10, 9)])).toBe(2)
    expect(computeStreak(checkIns, today, [d(2023, 10, 9), d(2023, 10, 8)])).toBe(4)
  })

  it('a freeze cannot stand in for showing up today', () => {
    const today = d(2023, 10, 10)
    const checkIns = [{ date: d(2023, 10, 9), isRest: false }]

    expect(computeStreak(checkIns, today, [d(2023, 10, 10)])).toBe(0)
  })

  it('a freeze on an unrelated day changes nothing', () => {
    const today = d(2023, 10, 10)
    const checkIns = [
      { date: d(2023, 10, 10), isRest: false },
      { date: d(2023, 10, 9), isRest: false },
    ]

    expect(computeStreak(checkIns, today, [d(2023, 5, 1)])).toBe(2)
  })

  it('a freeze dated in the future is ignored', () => {
    const today = d(2023, 10, 10)
    const checkIns = [{ date: d(2023, 10, 10), isRest: false }]

    expect(computeStreak(checkIns, today, [d(2023, 10, 11)])).toBe(1)
  })
})
