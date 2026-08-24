import { describe, it, expect } from 'vitest'
import { playerLevel } from './playerLevel'

describe('playerLevel', () => {
  it('the ladder maps defeats to levels (table-driven over 0,1,2,3,5,8,13,21,34)', () => {
    const cases: Array<[number, string]> = [
      [0, 'baby'],
      [1, 'toddler'],
      [2, 'tween'],
      [3, 'page'],
      [5, 'squire'],
      [8, 'knight'],
      [13, 'barbarian'],
      [21, 'warlord'],
      [34, 'legend'],
    ]

    for (const [defeats, expectedName] of cases) {
      const result = playerLevel(defeats)
      expect(result.name).toBe(expectedName)
      expect(result.defeats).toBe(defeats)
    }
  })

  it('progress and nextAt inside a band and at the cap', () => {
    // 0 -> level 0 'baby', nextAt 1, progress 0
    const baby = playerLevel(0)
    expect(baby.level).toBe(0)
    expect(baby.nextAt).toBe(1)
    expect(baby.progress).toBe(0)

    // 5 -> level 4 'squire', nextAt 8, progress 0
    const squire = playerLevel(5)
    expect(squire.level).toBe(4)
    expect(squire.nextAt).toBe(8)
    expect(squire.progress).toBe(0)

    // 6 -> level 4, progress 1/3 (6 is 1 step into the 5->8 band)
    const progressMid = playerLevel(6)
    expect(progressMid.level).toBe(4)
    expect(progressMid.progress).toBeCloseTo(1 / 3)

    // 34 -> level 8 'legend', nextAt null, progress 1
    const legend = player(34)
    expect(legend.level).toBe(8)
    expect(legend.nextAt).toBeNull()
    expect(legend.progress).toBe(1)

    // 100 -> level 8 (cap)
    const cap = playerLevel(100)
    expect(cap.level).toBe(8)
    expect(cap.nextAt).toBeNull()
    expect(cap.progress).toBe(1)
  })

  it('garbage input clamps safely', () => {
    // -3 -> level 0
    const negative = playerLevel(-3)
    expect(negative.defeats).toBe(0)
    expect(negative.level).toBe(0)

    // NaN -> level 0
    const nanVal = playerLevel(NaN as any)
    expect(nanVal.defeats).toBe(0)
    expect(nanVal.level).toBe(0)

    // Float 5.7 -> 5
    const floatVal = playerLevel(5.7)
    expect(floatVal.defeats).toBe(5)
    expect(floatVal.level).toBe(4)
  })
})

// Helper to avoid repetition in the test body
function player(n: number) {
  return playerLevel(n)
}