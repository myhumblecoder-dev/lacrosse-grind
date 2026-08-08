import { describe, it, expect, vi } from 'vitest'
import { formatSeasonRange } from './seasonLabel'
import { SEASON_START, getSeasonEnd } from '@/lib/season'
import { formatWeekLabel } from '@/lib/weekUtils'

// Mock the dependencies
vi.mock('@/lib/season', () => ({
  SEASON_START: new Date(Date.UTC(2026, 7, 10)), // 10 Aug 2026
  getSeasonEnd: vi.fn(() => new Date(Date.UTC(2026, 10, 9))), // 09 Nov 2026
}))

vi.mock('@/lib/weekUtils', () => ({
  formatWeekLabel: vi.fn((date: Date) => {
    // Return a deterministic string based on the date to verify the logic
    // We use UTC components to ensure timezone independence
    const day = date.getUTCDate()
    const month = date.getUTCMonth() + 1
    return `Week-${day}-${month}`
  }),
}))

describe('seasonLabel', () => {
  it('the returned string contains the formatted season start', () => {
    const result = formatSeasonRange()
    // Based on our mock, SEASON_START is 10 Aug 2026
    // formatWeekLabel returns Week-10-8
    expect(result).toContain('Week-10-8')
  })

  it('the returned string contains the formatted season end', () => {
    const result = formatSeasonRange()
    // Based on our mock, getSeasonEnd returns 09 Nov 2026
    // formatWeekLabel returns Week-9-11
    expect(result).toContain('Week-9-11')
  })

  it('the two halves are joined by a spaced en dash', () => {
    const result = formatSeasonRange()
    // The requirement is "part1 – part2"
    // We check for the specific en dash character (\u2013) surrounded by spaces
    expect(result).toMatch(/Week-10-8 \u2013 Week-9-11/)
  })
})
