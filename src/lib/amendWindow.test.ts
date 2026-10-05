import { describe, it, expect } from 'vitest'
import { isWithinAmendWindow } from './amendWindow'

// 2026-09-30 is a Wednesday; its week runs Mon 2026-09-28 → Sun 2026-10-04.
const WEDNESDAY = new Date('2026-09-30T00:00:00.000Z')
const MONDAY = new Date('2026-09-28T00:00:00.000Z')
const TUESDAY = new Date('2026-09-29T00:00:00.000Z')
const THURSDAY = new Date('2026-10-01T00:00:00.000Z')
const LAST_SUNDAY = new Date('2026-09-27T00:00:00.000Z')

describe('isWithinAmendWindow', () => {
  it('today is amendable', () => {
    expect(isWithinAmendWindow(WEDNESDAY, WEDNESDAY)).toBe(true)
  })

  it('an earlier day this week is amendable', () => {
    expect(isWithinAmendWindow(TUESDAY, WEDNESDAY)).toBe(true)
  })

  it("this week's Monday is amendable — the bound is inclusive", () => {
    expect(isWithinAmendWindow(MONDAY, WEDNESDAY)).toBe(true)
  })

  it('the Sunday before this week is not amendable', () => {
    expect(isWithinAmendWindow(LAST_SUNDAY, WEDNESDAY)).toBe(false)
  })

  it('tomorrow is not amendable', () => {
    expect(isWithinAmendWindow(THURSDAY, WEDNESDAY)).toBe(false)
  })

  it('a Monday is amendable on that Monday, when the week is one day long', () => {
    expect(isWithinAmendWindow(MONDAY, MONDAY)).toBe(true)
  })

  it('the Sunday before is still out of range on a Monday', () => {
    expect(isWithinAmendWindow(LAST_SUNDAY, MONDAY)).toBe(false)
  })

  it('a day before the lane started is not amendable', () => {
    expect(
      isWithinAmendWindow(MONDAY, WEDNESDAY, { laneStartsOn: TUESDAY })
    ).toBe(false)
  })

  it('a day on or after the lane start is amendable', () => {
    expect(
      isWithinAmendWindow(TUESDAY, WEDNESDAY, { laneStartsOn: TUESDAY })
    ).toBe(true)
  })

  it('a day before the season start is not amendable', () => {
    expect(
      isWithinAmendWindow(MONDAY, WEDNESDAY, { seasonStart: TUESDAY })
    ).toBe(false)
  })

  it('null floors are ignored', () => {
    expect(
      isWithinAmendWindow(MONDAY, WEDNESDAY, { laneStartsOn: null, seasonStart: null })
    ).toBe(true)
  })

  it('an omitted floors argument behaves as no floors', () => {
    expect(isWithinAmendWindow(MONDAY, WEDNESDAY)).toBe(true)
  })

  it('compares calendar days, not instants — a mid-afternoon today still matches', () => {
    const afternoon = new Date('2026-09-30T18:45:00.000Z')
    expect(isWithinAmendWindow(afternoon, WEDNESDAY)).toBe(true)
  })

  it('a Sunday today still admits that week whole Monday', () => {
    const sunday = new Date('2026-10-04T00:00:00.000Z')
    expect(isWithinAmendWindow(MONDAY, sunday)).toBe(true)
  })
})
