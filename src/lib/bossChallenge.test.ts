import { describe, it, expect } from 'vitest'
import { buildChallengePrompt } from './bossChallenge'

describe('bossChallenge', () => {
  it('a rank makes the prompt address it', () => {
    const laneName = 'Pushups'
    const emoji = '💪'
    const rankName = 'Legendary'
    const prompt = buildChallengePrompt(laneName, emoji, rankName)

    expect(prompt).toContain(`worthy of a ${rankName}`)
    expect(prompt).toContain("Scale the challenge\'s epic FLAVOR (wording, not difficulty) to that rank")
  })

  it('no rank keeps the prompt exactly as before', () => {
    const laneName = 'Pushups'
    const emoji = '💪'
    const prompt = buildChallengePrompt(laneName, emoji)

    // Verifying the exact string content for the 2-argument case
    const expected = `You are an effort-focused youth coach. Your task is to invent ONE real-world boss challenge derived from the lane: ${laneName} ${emoji}.\n\nRules:\n1. The challenge must be related to the lane's exercise but provide a fresh twist.\n2. Use the same effort scale as the lane.\n3. The challenge must be completable by showing up (NEVER use framing like faster, heavier, or better-than-last-time).\n4. The challenge must be age-appropriate for a kid.\n5. The challenge must need no equipment beyond what the lane itself implies.\n6. Answer in 1-2 sentences with no preamble.`
    
    expect(prompt).toBe(expected)
  })

  it('the prompt carries the lane name and emoji', () => {
    const laneName = 'Pushups'
    const emoji = '💪'
    const prompt = buildChallengePrompt(laneName, emoji)

    expect(prompt).toContain(laneName)
    expect(prompt).toContain(emoji)
  })

  it('the prompt forbids performance framing', () => {
    const prompt = buildermChallengePrompt('Running', '🏃')
    
    expect(prompt).toContain('completable by showing up')
    expect(prompt).toContain('NEVER use framing like faster, heavier, or better-than-last-time')
  })

  it('the prompt demands a short answer', () => {
    const prompt = buildChallengePrompt('Plank', '🧘')
    
    expect(prompt).toContain('Answer in 1-2 sentences with no preamble.')
  })
})

// Helper to avoid duplication in the test file if needed, though not strictly required by prompt
function buildermChallengePrompt(laneName: string, emoji: string) {
  return buildChallengePrompt(laneName, emoji)
}