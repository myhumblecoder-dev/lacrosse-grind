import { describe, it, expect } from 'vitest'
import { resolveSeasonStart } from './seasonAnchor'

describe('seasonAnchor', () => {
  it('a Monday returns that same Monday at midnight', () => {
    // Monday, May 20, 2024
    const monday = new Date(Date.UTC(2024, 4, 20, 14, 30, 0))
    const result = resolveSeasonStart(monday)
    
    expect(result.getUTCFullYear()).toBe(2024)
    expect(result.getUTCMonth()).toBe(4)
    expect(result.getUTCDate()).toBe(20)
    expect(result.getUTCHours()).toBe(0)
    expect(result.getUTCMinutes()).toBe(0)
    expect(result.getUTCSeconds()).toBe(0)
  })

  it('a Wednesday returns the following Monday', () => {
    // Wednesday, May 22, 2024
    const wednesday = new Date(Date.UTC(2024, 4, 22, 10, 0, 0))
    const result = resolveSeasonStart(wednesday)
    
    // Should be Monday, May 27, 2024
    expect(result.getUTCFullYear()).toBe(2024)
    expect(result.getUTCMonth()).toBe(4)
    expect(result.getUTCDate()).toBe(27)
    expect(result.getUTCHours()).toBe(0)
  })

  it('a Sunday returns the next day', () => {
    // Sunday, May 26, 2024
    const sunday = new Date(Date.UTC(2024, 4, 26, 23, 59, 59))
    const result = resolveSeasonStart(sunday)
    
    // Should be Monday, May 27, 2024
    expect(result.getUTCFullYear()).toBe(2024)
    expect(result.getUTCMonth()).toBe(4)
    expect(result.getUTCDate()).toBe(27)
    expect(result.getUTCHours()).toBe(0)
  })
})
