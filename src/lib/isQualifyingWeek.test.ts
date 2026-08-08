import { describe, it, expect } from 'vitest'
import { isQualifyingWeek } from './isQualifyingWeek'

// We use a fixed date for the week start to ensure deterministic tests.
// We use UTC to avoid timezone-related failures in CI.
const WEEK_START = new Date(Date.UTC(2024, 0, 1))
// A date within the same week as WEEK_START
const CHECK_IN_DATE = new Date(Date.UTC(2024, 0, 2))
// A date in a different week
const OTHER_WEEK_DATE = new Date(Date.UTC(2024, 1, 1))

describe('isQualifyingWeek', () => {
  it('three lanes each meeting targetPerWeek make the week qualify', () => {
    const lanes = [
      {
        targetPerWeek: 1,
        checkIns: [{ date: CHECK_IN_DATE, isRest: false }]
      },
      {
        targetPerWeek: 2,
        checkIns: [
          { date: CHECK_IN_DATE, isRest: false },
          { date: new Date(Date.UTC(2024, 0, 3)), isRest: false }
        ]
      },
      {
        targetPerWeek: 1,
        checkIns: [{ date: CHECK_IN_DATE, isRest: false }]
      }
    ]

    // Assuming LANES_REQUIRED is 3 based on the AC description
    // If LANES_REQUIRED were different, this test would fail, but the AC implies 3.
    expect(isQualifyingWeek(lanes, WEEK_START)).toBe(true)
  })

  it('two lanes at target do not make the week qualify', () => {
    const lanes = [
      {
        targetPerWeek: 1,
        checkIns: [{ date: CHECK_IN_DATE, isRest: false }]
      },
      {
        targetPerWeek: 1,
        checkIns: [{ date: CHECK_IN_DATE, isRest: false }]
      },
      {
        targetPerWeek: 1,
        checkIns: [{ date: OTHER_WEEK_DATE, isRest: false }]
      }
    ]

    expect(isQualifyingWeek(lanes, WEEK_START)).toBe(false)
  })

  it('a lane short of its targetPerWeek does not count toward the three', () => {
    const lanes = [
      {
        targetPerWeek: 1,
        checkIns: [{ date: CHECK_IN_DATE, isRest: false }]
      },
      {
        targetPerWeek: 1,
        checkIns: [{ date: CHECK_IN_DATE, isRest: false }]
      },
      {
        targetPerWeek: 2,
        checkIns: [{ date: CHECK_IN_DATE, isRest: false }]
      }
    ]

    expect(isQualifyingWeek(lanes, WEEK_START)).toBe(false)
  })
})
