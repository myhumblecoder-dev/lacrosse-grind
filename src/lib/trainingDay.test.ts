import { describe, it, expect } from 'vitest'
import { TRAINING_TZ, DAY_ROLLOVER_HOUR, getTrainingDay } from './trainingDay'

/**
 * Helper to create a Date object from a UTC ISO string.
 * This ensures tests are timezone-independent.
 */
const createUTCDate = (isoString: string) => new Date(isoString)

/**
 * Helper to assert that a Date object represents the start of a specific UTC day.
 */
const assertIsUtcMidnightOf = (date: Date, year: number, month: number, day: number) => {
  const expected = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
  expect(date.getUTCFullYear()).toBe(year)
  expect(date.getUTCMonth()).toBe(month - 1)
  expect(date.getUTCDate()).toBe(day)
  expect(date.getUTCHours()).toBe(0)
  expect(date.getUTCMinutes()).toBe(0)
  expect(date.getUTCSeconds()).toBe(0)
  expect(date.toISOString()).toBe(expected.toISOString())
}

describe('trainingDay', () => {
  it('training timezone is New York', () => {
    expect(TRAINING_TZ).toBe('America/New_York')
  })

  it('rollover hour is 3am', () => {
    expect(DAY_ROLLOVER_HOUR).toBe(3)
  })

  it('noon local maps to that day', () => {
    // 2026-08-05 12:00:00 EDT (UTC-4)
    // 12:00 EDT is 16:00 UTC
    const now = createUTCDate('2026-08-05T16:00:00Z')
    const result = getTrainingDay(now)
    
    // Noon is after 3am, so it should be the same day
    assertIsUtcMidnightOf(result, 2026, 8, 5)
  })

  it('1am local maps to previous day', () => {
    // 2026-08-05 01:00:00 EDT (UTC-4)
    // 01:00 EDT is 05:00 UTC
    const now = createUTCDate('2026-08-05T05:00:00Z')
    const result = getTrainingDay(now)
    
    // 1am is before 3am rollover, so it belongs to the previous day (Aug 4)
    assertIsUtcMidnightOf(result, 2026, 8, 4)
  })

  it('4am local maps to same day', () => {
    // 2026-08-05 04:00:00 EDT (UTC-4)
    // 04:00 EDT is 08:00 UTC
    const now = createUTCDate('2026-08-05T08:00:00Z')
    const result = getTrainingDay(now)
    
    // 4am is after 3am rollover, so it belongs to the same day (Aug 5)
    assertIsUtcMidnightOf(result, 2026, 8, 5)
  })

  it('9pm local maps to same day', () => {
    // 2026-08-05 21:00:00 EDT (UTC-4)
    // 21:00 EDT is 01:00 UTC (next day)
    const now = createUTCDate('2026-08-06T01:00:00Z')
    const result = getTrainingDay(now)
    
    // 9pm is after 3am rollover, so it belongs to the same day (Aug 5)
    assertIsUtcMidnightOf(result, 2026, 8, 5)
  })
})
