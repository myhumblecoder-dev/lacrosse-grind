import { describe, it, expect } from 'vitest'
import { buildVictorySummaryPrompt, type VictoryInput } from './victorySummary'

describe('victorySummary', () => {
  const baseInput: VictoryInput = {
    laneName: 'Dragon Den',
    challenge: 'Summer Heat',
    defeats: 5,
    levelName: 'Novice',
    leveledUp: false
  }

  it('the prompt carries the record (lane, challenge, count, rank)', () => {
    const prompt = buildVictorySummaryPrompt(baseInput)
    
    expect(prompt).toContain('Dragon Den')
    expect(prompt).toContain('Summer Heat')
    expect(prompt).toContain('5')
    expect(prompt).toContain('Novice')
  })

  it('a level-up asks the coach to celebrate the new rank', () => {
    const leveledUpInput: VictoryInput = {
      ...baseInput,
      levelName: 'Warrior',
      leveledUp: true
    }
    
    const prompt = buildVictorySummaryPrompt(leveledUpInput)
    
    expect(prompt).toContain('celebrate their promotion to the Warrior rank')
  })

  it('the guardrail phrases are present', () => {
    const prompt = buildngVictorySummaryPrompt(baseInput)
    
    expect(prompt).toContain('keeps showing up')
    expect(prompt).toContain('never grades')
  })
})

// Helper to avoid repetition in tests if needed, though not strictly required by prompt
function buildngVictorySummaryPrompt(input: VictoryInput) {
  return buildVictorySummaryPrompt(input)
}