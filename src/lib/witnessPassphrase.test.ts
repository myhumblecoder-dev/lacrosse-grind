import { describe, it, expect } from 'vitest'
import { hashWitnessPassphrase, verifyWitnessPassphrase } from './witnessPassphrase'

describe('hashWitnessPassphrase', () => {
  it('returns a different string each time for the same passphrase', () => {
    const a = hashWitnessPassphrase('watched him all week')
    const b = hashWitnessPassphrase('watched him all week')
    expect(a).not.toBe(b)
  })

  it('returns a salt and a hash separated by a colon', () => {
    const hashed = hashWitnessPassphrase('watched him all week')
    expect(hashed.split(':')).toHaveLength(2)
  })

  it('does not contain the plaintext', () => {
    const hashed = hashWitnessPassphrase('watched him all week')
    expect(hashed).not.toContain('watched him all week')
  })
})

describe('verifyWitnessPassphrase', () => {
  it('returns true for the passphrase that was hashed', () => {
    const hashed = hashWitnessPassphrase('watched him all week')
    expect(verifyWitnessPassphrase('watched him all week', hashed)).toBe(true)
  })

  it('returns false for a different passphrase', () => {
    const hashed = hashWitnessPassphrase('watched him all week')
    expect(verifyWitnessPassphrase('watched him all weel', hashed)).toBe(false)
  })

  it('is case sensitive', () => {
    const hashed = hashWitnessPassphrase('watched him all week')
    expect(verifyWitnessPassphrase('Watched him all week', hashed)).toBe(false)
  })

  it('returns false for a null stored value', () => {
    expect(verifyWitnessPassphrase('watched him all week', null)).toBe(false)
  })

  it('returns false for an undefined stored value', () => {
    expect(verifyWitnessPassphrase('watched him all week', undefined)).toBe(false)
  })

  it('returns false for an empty stored value', () => {
    expect(verifyWitnessPassphrase('watched him all week', '')).toBe(false)
  })

  it('returns false for a stored value with no colon separator', () => {
    expect(verifyWitnessPassphrase('watched him all week', 'deadbeef')).toBe(false)
  })

  it('returns false for a stored value with an empty salt', () => {
    expect(verifyWitnessPassphrase('watched him all week', ':deadbeef')).toBe(false)
  })

  it('returns false for a stored hash of the wrong length rather than throwing', () => {
    expect(verifyWitnessPassphrase('watched him all week', 'abc123:ff')).toBe(false)
  })
})
