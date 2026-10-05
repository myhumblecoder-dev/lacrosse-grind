import { describe, it, expect } from 'vitest'
import { mayRecord, mayRemove, type ExistingCheckIn } from './checkInAuthorship'

const ATTESTED_AT = new Date('2026-09-30T12:00:00.000Z')

const unmarked: ExistingCheckIn = null
const playerSession: ExistingCheckIn = { attestedAt: null, isRest: false }
const playerRest: ExistingCheckIn = { attestedAt: null, isRest: true }
const witnessSession: ExistingCheckIn = { attestedAt: ATTESTED_AT, isRest: false }
const witnessRest: ExistingCheckIn = { attestedAt: ATTESTED_AT, isRest: true }

describe('mayRecord — player', () => {
  it('may mark an unmarked day', () => {
    expect(mayRecord('player', unmarked, false)).toEqual({ allowed: true })
  })

  it('may change their own entry', () => {
    expect(mayRecord('player', playerSession, true)).toEqual({ allowed: true })
  })

  it('may re-send their own entry unchanged', () => {
    expect(mayRecord('player', playerSession, false)).toEqual({ allowed: true })
  })

  it("may not rewrite a witness's session into a rest day", () => {
    expect(mayRecord('player', witnessSession, true)).toEqual({
      allowed: false,
      error: 'attested',
    })
  })

  it("may not rewrite a witness's rest day into a session", () => {
    expect(mayRecord('player', witnessRest, false)).toEqual({
      allowed: false,
      error: 'attested',
    })
  })

  it('may not touch a witness entry even when nothing would change', () => {
    expect(mayRecord('player', witnessSession, false)).toEqual({
      allowed: false,
      error: 'attested',
    })
  })
})

describe('mayRecord — witness', () => {
  it('may attest an unmarked day', () => {
    expect(mayRecord('witness', unmarked, false)).toEqual({ allowed: true })
  })

  it("may not restamp the player's own session as a witness statement", () => {
    expect(mayRecord('witness', playerSession, false)).toEqual({
      allowed: false,
      error: 'already-marked',
    })
  })

  it("may not restamp the player's own rest day", () => {
    expect(mayRecord('witness', playerRest, true)).toEqual({
      allowed: false,
      error: 'already-marked',
    })
  })

  it("may flip the player's session to a rest day — that is a real change", () => {
    expect(mayRecord('witness', playerSession, true)).toEqual({ allowed: true })
  })

  it("may flip the player's rest day to a session", () => {
    expect(mayRecord('witness', playerRest, false)).toEqual({ allowed: true })
  })

  it('may edit a statement it already owns, unchanged', () => {
    expect(mayRecord('witness', witnessSession, false)).toEqual({ allowed: true })
  })

  it('may change a statement it already owns', () => {
    expect(mayRecord('witness', witnessSession, true)).toEqual({ allowed: true })
  })
})

describe('mayRemove', () => {
  it('a player may remove their own entry', () => {
    expect(mayRemove('player', playerSession)).toEqual({
      allowed: true,
      existing: playerSession,
    })
  })

  it('a player may not remove a witness entry', () => {
    expect(mayRemove('player', witnessSession)).toEqual({
      allowed: false,
      error: 'attested',
    })
  })

  it("a witness may remove the player's entry — that is the feature", () => {
    expect(mayRemove('witness', playerSession)).toEqual({
      allowed: true,
      existing: playerSession,
    })
  })

  it('a witness may remove its own entry', () => {
    expect(mayRemove('witness', witnessRest)).toEqual({
      allowed: true,
      existing: witnessRest,
    })
  })

  it('neither may remove a day that was never marked', () => {
    expect(mayRemove('player', unmarked)).toEqual({ allowed: false, error: 'not-found' })
    expect(mayRemove('witness', unmarked)).toEqual({ allowed: false, error: 'not-found' })
  })

  it('an allowed removal carries the row it proved present', () => {
    const verdict = mayRemove('witness', playerRest)
    expect(verdict.allowed).toBe(true)
    if (verdict.allowed) {
      expect(verdict.existing.isRest).toBe(true)
    }
  })
})
