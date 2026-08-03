import { describe, it, expect } from 'vitest'
import { laneSchema, checkInSchema, bossBattleSchema, reflectionSchema } from './validation'

describe('validation', () => {
  it('laneSchema valid input passes', () => {
    const validData = {
      name: 'Lacrosse',
      emoji: '🥍',
      targetPerWeek: 5
    }
    const result = laneSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Lacrosse')
    }
  })

  it('laneSchema empty name fails', () => {
    const invalidData = {
      name: '   ',
      emoji: '🥍',
      targetPerWeek: 5
    }
    const result = laneSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('laneSchema name too long fails', () => {
    const invalidData = {
      name: 'A'.repeat(41),
      emoji: '🥍',
      targetPerWeek: 5
    }
    const result = laneSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('checkInSchema valid input passes', () => {
    const date = new Date(Date.UTC(2023, 10, 1, 12, 0, 0))
    const validData = {
      laneId: 'clp1234567890abcdefghij',
      date: date,
      isRest: true,
      note: 'Feeling good'
    }
    const result = checkInSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.date.getUTCMonth()).toBe(10)
      expect(result.data.laneId).toBe('clp1234567890abcdefghij')
    }
  })

  it('checkInSchema missing laneId fails', () => {
    const invalidData = {
      date: new Date(Date.UTC(2023, 10, 1)),
      isRest: false
    }
    const result = checkInSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('bossBattleSchema empty selfReport fails', () => {
    const invalidData = {
      laneId: 'clp1234567890abcdefghij',
      weekStarting: new Date(Date.UTC(2023, 10, 1)),
      selfReport: '   '
    }
    const resultParse = bossBattleSchema.safeParse(invalidData)
    expect(resultParse.success).toBe(false)
  })

  it('reflectionSchema too long playerNote fails', () => {
    const invalidData = {
      weekStarting: new Date(Date.UTC(2023, 10, 1)),
      playerNote: 'A'.repeat(501)
    }
    const result = reflectionSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})