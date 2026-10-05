import { describe, it, expect } from 'vitest'
import { buildAmendWeek, type AmendLaneInput } from './amendWeek'

// 2026-09-30 is a Wednesday; its week runs Mon 2026-09-28 → Sun 2026-10-04.
const WEDNESDAY = new Date('2026-09-30T00:00:00.000Z')
const SUNDAY = new Date('2026-10-04T00:00:00.000Z')
const MONDAY = new Date('2026-09-28T00:00:00.000Z')
const TUESDAY = new Date('2026-09-29T00:00:00.000Z')

function lane(overrides: Partial<AmendLaneInput> = {}): AmendLaneInput {
  return {
    id: 'lane-1',
    name: 'Stick Skills',
    emoji: '🥍',
    startsOn: null,
    checkIns: [],
    removals: [],
    ...overrides,
  }
}

describe('buildAmendWeek', () => {
  it('emits three days on a Wednesday', () => {
    const [row] = buildAmendWeek([lane()], WEDNESDAY, null)
    expect(row.days).toHaveLength(3)
  })

  it('emits seven days on a Sunday', () => {
    const [row] = buildAmendWeek([lane()], SUNDAY, null)
    expect(row.days).toHaveLength(7)
  })

  it('starts on this week Monday and ends on today', () => {
    const [row] = buildAmendWeek([lane()], WEDNESDAY, null)
    expect(row.days[0].date.toISOString()).toBe(MONDAY.toISOString())
    expect(row.days[2].date.toISOString()).toBe(WEDNESDAY.toISOString())
  })

  it('a day with a non-rest check-in reads session', () => {
    const rows = buildAmendWeek(
      [lane({ checkIns: [{ date: TUESDAY, isRest: false, attestedAt: null }] })],
      WEDNESDAY,
      null
    )
    expect(rows[0].days[1].state).toBe('session')
  })

  it('a day with a rest check-in reads rest', () => {
    const rows = buildAmendWeek(
      [lane({ checkIns: [{ date: TUESDAY, isRest: true, attestedAt: null }] })],
      WEDNESDAY,
      null
    )
    expect(rows[0].days[1].state).toBe('rest')
  })

  it('a day with only a removal reads withdrawn', () => {
    const rows = buildAmendWeek(
      [lane({ removals: [{ date: TUESDAY }] })],
      WEDNESDAY,
      null
    )
    expect(rows[0].days[1].state).toBe('withdrawn')
  })

  it('a day with both a check-in and a removal reads session — the live row wins', () => {
    const rows = buildAmendWeek(
      [
        lane({
          checkIns: [{ date: TUESDAY, isRest: false, attestedAt: null }],
          removals: [{ date: TUESDAY }],
        }),
      ],
      WEDNESDAY,
      null
    )
    expect(rows[0].days[1].state).toBe('session')
  })

  it('a day with neither reads empty', () => {
    const [row] = buildAmendWeek([lane()], WEDNESDAY, null)
    expect(row.days.map((d) => d.state)).toEqual(['empty', 'empty', 'empty'])
  })

  it('attested is true only when attestedAt is set', () => {
    const rows = buildAmendWeek(
      [
        lane({
          checkIns: [
            { date: MONDAY, isRest: false, attestedAt: null },
            { date: TUESDAY, isRest: false, attestedAt: new Date('2026-09-30T12:00:00.000Z') },
          ],
        }),
      ],
      WEDNESDAY,
      null
    )
    expect(rows[0].days[0].attested).toBe(false)
    expect(rows[0].days[1].attested).toBe(true)
  })

  it('attested is false on an empty day', () => {
    const [row] = buildAmendWeek([lane()], WEDNESDAY, null)
    expect(row.days.every((d) => d.attested === false)).toBe(true)
  })

  it('every day of the current week is amendable with no floors', () => {
    const [row] = buildAmendWeek([lane()], WEDNESDAY, null)
    expect(row.days.every((d) => d.amendable)).toBe(true)
  })

  it('days before a lane startsOn are not amendable', () => {
    const [row] = buildAmendWeek([lane({ startsOn: TUESDAY })], WEDNESDAY, null)
    expect(row.days.map((d) => d.amendable)).toEqual([false, true, true])
  })

  it('days before the season start are not amendable', () => {
    const [row] = buildAmendWeek([lane()], WEDNESDAY, TUESDAY)
    expect(row.days.map((d) => d.amendable)).toEqual([false, true, true])
  })

  it('matches on calendar day, not instant', () => {
    const afternoonCheckIn = new Date('2026-09-29T19:30:00.000Z')
    const rows = buildAmendWeek(
      [lane({ checkIns: [{ date: afternoonCheckIn, isRest: false, attestedAt: null }] })],
      WEDNESDAY,
      null
    )
    expect(rows[0].days[1].state).toBe('session')
  })

  it('preserves the order of the lanes it was given', () => {
    const rows = buildAmendWeek(
      [lane({ id: 'b', name: 'Shooting' }), lane({ id: 'a', name: 'Conditioning' })],
      WEDNESDAY,
      null
    )
    expect(rows.map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('carries the lane name and emoji through', () => {
    const [row] = buildAmendWeek([lane({ emoji: '🏃', name: 'Conditioning' })], WEDNESDAY, null)
    expect(row.name).toBe('Conditioning')
    expect(row.emoji).toBe('🏃')
  })

  it('returns an empty array for no lanes', () => {
    expect(buildAmendWeek([], WEDNESDAY, null)).toEqual([])
  })
})
