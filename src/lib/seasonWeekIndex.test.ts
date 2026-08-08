import { describe, it, expect, vi } from 'vitest'
import { getSeasonWeekIndex } from './seasonWeekIndex'
import * as season from '@/lib/season'

// Mock the season module to control the boundaries
vi.mock('@/lib/season', () => ({
  getSeasonWeeks: vi.fn(),
  getSeasonEnd: vi.fn(),
}))

describe('seasonWeekIndex', () => {
  const seasonStart = new Date(Date.UTC(2026, 7, 10)) // 2026-08-10
  const seasonEnd = new Date(Date.UTC(2026, 10, 9))   // 2026-11-09
  const week1Start = new Date(Date.UTC(2026, 7, 10))
  const week2Start = new Date(Date.UTC(2026, 7, 17))

  it('a date inside the first season week returns 1', () => {
    vi.mocked(season.getSeasonWeeks).mockReturnValue([week1Start, week2Start])
    vi.mocked(season.getSeasonEnd).mockReturnValue(seasonEnd)

    // A date inside the first week (e.g., Aug 12)
    const testDate = new Date(Date.UTC(2026, 7, 12))
    const result = getSeasonWeekIndex(testDate)

    expect(result).toBe(1)
  })

  it('a date before the season starts returns null', () => {
    vi.mocked(season.getSeasonWeeks).mockReturnValue([week1Start, week2Start])
    vi.mocked(season.getSeasonEnd).mockReturnValue(seasonEnd)

    // A date before Aug 10
    const testDate = new Date(Date.UTC(2026, 7, 9))
    const result = getSeasonWeekIndex(testDate)

    expect(result).toBeNull()
  })

  it('a date after the season ends returns null', () => {
    vi.mocked(season.getSeasonWeeks).mockReturnValue([week1Start, week2Start])
    vi.mocked(season.getSeasonEnd).mockReturnValue(seasonEnd)

    // A date on or after Nov 9
    const testDate = new Date(Date.UTC(2026, 10, 9))
    const result = getSeasonWeekIndex(testDate)

    expect(result).toBeNull()
  })
})
