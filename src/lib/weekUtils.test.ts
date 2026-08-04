import { describe, it, expect } from 'vitest'
import { getWeekStart, getLastCompletedWeekStart, formatWeekLabel } from './weekUtils'

describe('weekUtils', () => {
  it('last completed week from midweek', () => {
    // Wednesday 2024-01-10
    // Current week start: Monday 2024-01-08
    // Last completed week start: Monday 2024-01-01
    const date = new Date(Date.UTC(2024, 0, 10))
    const result = getLastCompletedWeekStart(date)
    expect(result.getUTCFullYear()).toBe(2024)
    expect(result.getUTCMonth()).toBe(0)
    expect(result.getUTCDate()).toBe(1)
  })

  it('last completed week from Monday', () => {
    // Monday 2024-01-08
    // Current week start: Monday 2024-01-08
    // Last completed week start: Monday 2024-01-01
    const date = new Date(Date.UTC(2024, 0, 8))
    const result = getLastCompletedWeekStart(date)
    expect(result.getUTCFullYear()).toBe(2024)
    expect(result.getUTCMonth()).toBe(0)
    expect(result.getUTCDate()).toBe(1)
  })

  it('last completed week from Sunday', () => {
    // Sunday 2024-01-14
    // Current week start: Monday 2024-01-08
    // Last completed week start: Monday 2024-01-01
    const date = new Date(Date.UTC(2024, 0, 14))
    const result = getLastCompletedWeekStart(date)
    expect(result.getUTCFullYear()).toBe(2024)
    expect(result.getUTCMonth()).toBe(0)
    expect(result.getUTCDate()).toBe(1)
  })

  it('getWeekStart Monday input', () => {
    // Monday 2024-01-08
    const date = new Date(Date.UTC(2024, 0, 8))
    const result = getWeekStart(date)
    expect(result.getUTCFullYear()).toBe(2024)
    expect(result.getUTCMonth()).toBe(0)
    expect(result.getUTCDate()).toBe(8)
  })

  it('getWeekStart Wednesday input', () => {
    // Wednesday 2024-01-10
    const date = new Date(Date.UTC(2024, 0, 10))
    const result = getWeekStart(date)
    // Should return Monday 2024-01-08
    expect(result.getUTCFullYear()).toBe(2024)
    expect(result.getUTCMonth()).toBe(0)
    expect(result.getUTCDate()).toBe(8)
  })

  it('getWeekStart Sunday input', () => {
    // Sunday 2024-01-14
    const date = new Date(Date.UTC(2024, 0, 14))
    const result = getWeekStart(date)
    // Should return Monday 2024-01-08
    expect(result.getUTCFullYear()).toBe(2024)
    expect(result.getUTCMonth()).toBe(0)
    expect(result.getUTCDate()).toBe(8)
  })

  it('formatWeekLabel output format', () => {
    // Monday 2026-01-05 UTC
    const date = new Date(Date.UTC(2026, 0, 5))
    const label = formatWeekLabel(date)
    // Format: EEE dd MMM yyyy -> Mon 05 Jan 2026
    expect(label).toBe('Mon 05 Jan 2026')
  })
})
