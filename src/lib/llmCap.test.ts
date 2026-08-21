import { describe, it, expect } from 'vitest'
import { coachCapExceeded } from './llmCap'

describe('llmCap', () => {
  it('under the default cap is not exceeded', () => {
    // Default cap is 20. 19 should be false.
    expect(coachCapExceeded(19)).toBe(false)
  })

  it('at the default cap is exceeded', () => {
    // Default cap is 20. 20 should be true.
    expect(coachCapExceeded(20)).toBe(true)
  })

  it('a valid env limit overrides the default', () => {
    // If limit is 5, 5 should be true, 4 should be false.
    expect(coachCapExceeded(5, '5')).toBe(true)
    expect(coachCapExceeded(4, '5')).toBe(false)
  })

  it('garbage env limits fall back to the default', () => {
    // 'abc' is not a positive integer, should fall back to 20.
    // 20 should be true, 19 should be false.
    expect(coachCapExceeded(20, 'abc')).toBe(true)
    expect(coachCapExceeded(19, 'abc')).toBe(false)
    
    // '-5' is not a positive integer, should fall back to 20.
    expect(coachCapExceeded(20, '-5')).toBe(true)
    expect(coachCapExceeded(19, '-5')).toBe(false)
  })
})
