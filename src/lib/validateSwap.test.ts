import { describe, it, expect } from 'vitest'
import { validateSwap } from './validateSwap'

describe('validateSwap', () => {
  it('a raised floor blocks retirement at the old free count', () => {
    // If floor is 5, then 3 lanes (the old free count) should be blocked
    const result = validateSwap(3, 5)
    expect(result.blocked).toBe(true)
    expect(result.canRetire).toBe(false)
  })

  it('exactly at a raised floor demands a replacement', () => {
    // If floor is 5, then 5 lanes should require a replacement
    const result = validateSwap(5, 5)
    expect(result.mustPickReplacement).toBe(true)
    expect(result.canRetire).toBe(false)
    expect(result.blocked).toBe(false)
  })

  it('fewer than 3 lanes is blocked', () => {
    const result = validateSwap(2)
    expect(result).
      toEqual({
        canRetire: false,
        mustPickReplacement: false,
        blocked: true
      })
  })

  it('more than 3 lanes can retire', () => {
    const result = validateSwap(5)
    expect(result).
      toEqual({
        canRetire: true,
        mustPickReplacement: false,
        blocked: false
      })
  })

  it('4 lanes returns canRetire true', () => {
    const result = validateSwap(4)
    expect(result.canRetire).toBe(true)
  })

  it('exactly three lanes must pick a replacement', () => {
    const result = validateSwap(3)
    expect(result).toEqual({
      canRetire: false,
      mustPickReplacement: true,
      blocked: false
    })
  })
})
