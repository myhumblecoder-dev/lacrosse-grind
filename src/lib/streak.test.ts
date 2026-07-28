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
})
