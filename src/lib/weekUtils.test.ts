import { describe, it, expect } from 'vitest'
import { getWeekStart, get2WeekBlockStart, formatWeekLabel } from './weekUtils'

describe('weekUtils', () => {
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

  it('get2WeekBlockStart same block as Monday', () => {
    // Epoch starts 2024-01-01 (Monday). 
    // Block 0 is 2024-01-01 to 2024-01-14
    const date = new Date(Date.UTC(2024, 0, 5))
    const result = get2WeekBlockStart(date)
    expect(result.getUTCFullYear()).toBe(2024)
    expect(result.getUTCMonth()).toBe(0)
    expect(result.getUTCDate()).toBe(1)
  })

  it('get2WeekBlockStart two weeks apart different blocks', () => {
    // Block 0 starts 2024-01-01
    // Block 1 starts 2024-01-15
    const date1 = new Date(Date.UTC(2024, 0, 5))
    const date2 = new Date(Date.UTC(2024, 0, 20))
    
    const result1 = get2WeekBlockStart(date1)
    const result2 = get2WeekBlockStart(date2)

    expect(result1.getUTCDate()).toBe(1)
    expect(result2.getUTCDate()).toBe(15)
    expect(result2.getUTCMonth()).toBe(0)
    expect(result2.getUTCFullYear()).toBe(2024)
  })

  it('formatWeekLabel output format', () => {
    // Monday 2026-01-05 UTC
    const date = new Date(Date.UTC(2026, 0, 5))
    const label = formatWeekLabel(date)
    // Format: EEE dd MMM yyyy -> Mon 05 Jan 2026
    expect(label).toBe('Mon 05 Jan 2026')
  })
})
