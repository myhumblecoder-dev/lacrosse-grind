import { describe, it, expect } from 'vitest'
import { findRepairableGap } from '@/lib/repairableGap'

const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m, day))
const today = d(2023, 10, 10)

describe('findRepairableGap', () => {
  it('offers the missed day that reconnects today to an earlier run', () => {
    const checkIns = [
      { date: d(2023, 10, 10), isRest: false },
      // Oct 9 missed
      { date: d(2023, 10, 8), isRest: false },
      { date: d(2023, 10, 7), isRest: false },
    ]

    expect(findRepairableGap(checkIns, today)).toEqual(d(2023, 10, 9))
  })

  it('offers nothing when there is no run behind the gap', () => {
    // Freezing Oct 9 would buy exactly one day — a token earned by beating a
    // boss, spent for nothing.
    const checkIns = [{ date: d(2023, 10, 10), isRest: false }]

    expect(findRepairableGap(checkIns, today)).toBeNull()
  })

  it('offers nothing while today has no check-in', () => {
    const checkIns = [
      { date: d(2023, 10, 8), isRest: false },
      { date: d(2023, 10, 7), isRest: false },
    ]

    expect(findRepairableGap(checkIns, today)).toBeNull()
  })

  it('offers nothing when the run is already unbroken', () => {
    const checkIns = [
      { date: d(2023, 10, 10), isRest: false },
      { date: d(2023, 10, 9), isRest: false },
      { date: d(2023, 10, 8), isRest: false },
    ]

    expect(findRepairableGap(checkIns, today)).toBeNull()
  })

  it('moves to the next gap once one is already frozen', () => {
    const checkIns = [
      { date: d(2023, 10, 10), isRest: false },
      // Oct 9 frozen already, Oct 8 missed
      { date: d(2023, 10, 7), isRest: false },
      { date: d(2023, 10, 6), isRest: false },
    ]

    expect(findRepairableGap(checkIns, today, [d(2023, 10, 9)])).toEqual(d(2023, 10, 8))
  })

  it('offers nothing more once every gap is bridged', () => {
    const checkIns = [
      { date: d(2023, 10, 10), isRest: false },
      { date: d(2023, 10, 8), isRest: false },
    ]

    expect(findRepairableGap(checkIns, today, [d(2023, 10, 9)])).toBeNull()
  })

  it('a rest day behind the gap still counts as a run to reconnect to', () => {
    const checkIns = [
      { date: d(2023, 10, 10), isRest: false },
      { date: d(2023, 10, 8), isRest: true },
      { date: d(2023, 10, 7), isRest: true },
    ]

    expect(findRepairableGap(checkIns, today)).toEqual(d(2023, 10, 9))
  })
})
