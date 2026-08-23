import { describe, it, expect } from 'vitest'
import { requiredLanes } from './laneRequirement'

describe('laneRequirement', () => {
  it('the demand ladder maps levels to required lanes (table-driven over 0-8)', () => {
    const testCases: Array<[number, number]> = [
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 6],
      [7, 6],
      [8, 6],
    ]

    for (const [level, expected] of testCases) {
      expect(requiredLanes(level), `Level ${level} should require ${expected} lanes`).toBe(expected)
    }
  })

  it('garbage input clamps safely', () => {
    // Negative levels should be treated as 0 (which requires 3)
    expect(requiredLanes(-1)).toBe(3)
    expect(requiredLanes(-100)).toBe(3)

    // Floats should be floored (2.9 -> 2, which requires 3)
    expect(requiredLanes(2.9)).toBe(3)
    expect(requiredLanes(3.1)).toBe(4)

    // Null/Undefined/NaN should be treated as 0 (which requires 3)
    // @ts-expect-error: testing runtime robustness for non-number inputs
    expect(requiredLanes(null)).toBe(3)
    // @ts-expect-error: testing runtime robustness for non-number inputs
    expect(requiredLanes(undefined)).toBe(3)
    expect(requiredLanes(NaN)).toBe(3)
  })
})
