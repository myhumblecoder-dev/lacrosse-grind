import { describe, it, expect } from 'vitest'
import { validateSwap } from './validateSwap'

describe('validateSwap', () => {
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
})
