import { describe, it, expect } from 'vitest'
import { getWeekStatuses } from './weekStatuses'
import { getSeasonWeeksFrom } from '@/lib/seasonWindow'
import { isQualifyingWeek } from '@/lib/isQualifyingWeek'
import {SEASON_WEEKS } from '@/lib/season'

describe('weekStatuses', () => {
  it('the week windows follow an explicit seasonStart date', () => {
    // Use a custom season start date far in the future to avoid overlap with real constants
    const customStart = new Date(Date.UTC(2030, 0, 1))
    const today = new Date(Date.UTC(2030, 0, 15))
    const lanes: any[] = []

    const results = getWeekStatuses(lanes, today, customStart)

    // Verify the first week in the results matches our custom start
    expect(results[0].weekStart.getTime()).toBe(customStart.getTime())
    
    // Verify the number of weeks matches the expected season length
    expect(results.length).toBe(SEASON_WEEKS)
  })

  it('a null seasonStart makes every one of the thirteen weeks upcoming', () => {
    // When seasonStart is null, the function uses getSeasonWeeksFrom(today)
    // and every week is 'upcoming'.
    const today = new Date(Date.UTC(2025, 5, 10))
    const lanes: any[] = []

    const results = getWeekStatuses(lanes, today, null)

    expect(results.length).toBe(SEASON_WEEKS)
    results.forEach((res) => {
      expect(res.status).toBe('upcoming')
    })

    // The first week should start at the 'today' date (as per AC: getSeasonWeeksFrom(today))
    expect(results[0].weekStart.getTime()).toBe(today.getTime())
  })
})
