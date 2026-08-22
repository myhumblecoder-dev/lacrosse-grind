import { describe, it, expect } from 'vitest'
import { countQualifyingHits } from './qualifyingWeek'
import { REST_CAP_PER_WEEK } from '@/lib/season'

describe('qualifyingWeek', () => {
  it('four non-rest check-ins inside the week return 4', () => {
    const weekStart = new Date(Date.UTC(2024, 0, 1))
    const checkIns = [
      { date: new Date(Date.UTC(2024, 0, 1)), isRest: false },
      { date: new Date(Date.UTC(2024, 0, 2)), isRest: false },
      { date: new Date(Date.UTC(2024, 0, 3)), isRest: false },
      { date: new Date(Date.UTC(2024, 0, 4)), isRest: false },
    ]

    const result = countQualifyingHits(checkIns, weekStart)
    expect(result).toBe(4)
  })

  it('three rest check-ins in one week contribute only 1', () => {
    const weekStart = new Date(Date.UTC(2024, 0, 1))
    const checkIns = [
      { date: new Date(Date.UTC(2024, 0, 1)), isRest: true },
      { date: new Date(Date.UTC(2024, 0, 2)), isRest: true },
      { date: new Date(Date.UTC(2024, 0, 3)), isRest: true },
    ]

    // Since REST_CAP_PER_WEEK is 1 (as implied by the AC example),
    // three rest days should contribute exactly 1.
    const result = countQualifyingHits(checkIns, weekStart)
    expect(result).toBe(1)
  })

  it('check-ins dated outside the week window are ignored', () => {
    const weekStart = new Date(Date.UTC(2024, 0, 1))
    const weekEndMs = weekStart.getTime() + 7 * 24 * 60 * 60 * 1000

    const checkIns = [
      // Before the week
      { date: new Date(Date.UTC(2023, 11, 31)), isRest: false },
      // Exactly at the start (valid)
      { date: new Date(Date.UTC(2024, 0, 1)), isRest: false },
      // Inside the week
      { date: new Date(Date.UTC(2024, 0, 3)), isRest: false },
      // Exactly at the end (invalid - must be strictly less than)
      { date: new Date(weekEndMs), isRest: false },
      // After the week
      { date: new Date(Date.UTC(2024, 0, 10)), isRest: false },
    ]

    const result = countQualifyingHits(checkIns, weekStart)
    // Only the two check-ins at Jan 1 and Jan 3 are within [Jan 1, Jan 8)
    expect(result).toBe(2)
  })

  it('qualifyingWeek behaves per the acceptance criteria', () => {
    // The AC specifies that the dead line declaring weekEnd is DELETED.
    // Since we are testing the exported function's behavior and it remains unchanged,
    // we verify that the logic still correctly calculates hits within the 7-day window.
    const weekStart = new Date(Date.UTC(2024, 5, 1))
    const checkIns = [
      { date: new Date(Date.UTC(2024, 5, 1)), isRest: false },
      { date: new Date(Date.UTC(2024, 5, 7)), isRest: false },
      { date: new Date(Date.UTC(2024, 5, 8)), isRest: false }, // Outside
    ]
    
    const result = countQualifyingHits(checkIns, weekStart)
    expect(result).toBe(2)
  })
})
