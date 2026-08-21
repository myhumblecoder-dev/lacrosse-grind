import { describe, it, expect } from 'vitest'
import { swapSchema, laneSchema, checkInSchema, bossBattleSchema, prizeSchema } from './validation'

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
    } as any
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

  it('prize accepts a full valid record', () => {
    const validData = {
      title: 'MVP Award',
      description: 'For the best player of the season.',
      reasons: ['Great teamwork', 'High scoring'],
      photoUrl: 'https://example.com/photo.jpg'
    }
    const result = prizeSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('MVP Award')
      expect(result.data.reasons).toHaveLength(2)
    }
  })

  it('prize rejects an empty title', () => {
    const invalidData = {
      title: '   ',
      description: 'Valid description'
    }
    const result = prizeSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('prize rejects more than ten reasons', () => {
    const invalidData = {
      title: 'Too many reasons',
      reasons: Array(11).fill('Reason')
    }
    const result = prizeSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('prize accepts an empty reasons array', () => {
    const validData = {
      title: 'New Prize',
      reasons: []
    }
    const result = prizeSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reasons).toEqual([])
    }
  })

  describe('swapSchema', () => {
    it('a missing outLaneId is rejected', () => {
      const invalidData = { inLaneId: 'some-id' }
      const result = swapSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('a valid outLaneId with no inLaneId is accepted', () => {
      const validData = { outLaneId: 'some-id' }
      const result = swapSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.outLaneId).toBe('some-id')
        expect(result.data.inLaneId).toBeUndefined()
      }
    })

    it('an outLaneId of empty string is rejected', () => {
      const invalidData = { outLaneId: '', inLaneId: 'some-id' }
      const result = swapSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
