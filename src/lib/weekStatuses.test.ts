import { describe, it, expect } from 'vitest'
import { getWeekStatuses } from './weekStatuses'
import { getSeasonWeeks } from '@/lib/season'

describe('weekStatuses', () => {
  it('returns one entry per season week with weekStart values matching getSeasonWeeks', () => {
    const seasonWeeks = getSeasonWeeks()
    const today = new Date(Date.UTC(2026, 7, 10)) // 2026-08-10
    const lanes: any[] = []

    const results = getWeekStatuses(lanes, today)

    expect(results.length).toBe(seasonWeeks.length)
    seasonWeeks.forEach((weekStart, index) => {
      expect(results[index].weekStart.getTime()).toBe(weekStart.getTime())
    })
  })

  it('a today inside the season marks exactly one week current and every later week upcoming', () => {
    // Season starts 2026-08-10. 
    // We pick a date that is clearly in the middle of the season.
    // We use a date that is definitely not the very first or very last week.
    const today = new Date(Date.UTC(2026, 8, 15)) // 2026-09-15
    const lanes: any[] = []
    const results = getWeekStatuses(lanes, today)

    let currentCount = 0
    let upcomingCount = 0
    let elapsedCount = 0

    results.forEach((res) => {
      if (res.status === 'current') currentCount++
      if (res.status === 'upcoming') upcomingCount++
      if (res.status === 'qualified' || res.status === 'missed') elapsedCount++
    })

    expect(currentCount).toBe(1)
    expect(upcomingCount).toBeGreaterThan(0)
    // Ensure no 'upcoming' week is marked 'current'
    const upcomingWeek = results.find(r => r.status === 'upcoming')
    if (upcomingWeek) {
      expect(upcomingWeek.weekStart.getTime()).toBeGreaterThan(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    }
  })

  it('an elapsed week with no check-ins at all is missed', () => {
    // Pick a date far in the future so the first week of the season is definitely elapsed
    const today = new Date(Date.UTC(2027, 0, 1)) 
    const lanes: any[] = [] // No check-ins
    const results = getWeekStatuses(lanes, today)

    // The first week of the season (2026-08-10) should be 'missed' because there are no check-ins
    const firstWeek = results[0]
    expect(firstWeek.weekStart.getUTCMonth()).toBe(7) // August
    expect(firstWeek.weekStart.getUTCDate()).toBe(10)
    expect(firstWeek.status).toBe('missed')
  })
})
