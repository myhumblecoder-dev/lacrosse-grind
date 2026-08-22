import { describe, it, expect } from 'vitest'
import { buildChallengePrompt } from './bossChallenge'

describe('bossChallenge', () => {
  it('the prompt carries the lane name and emoji', () => {
    const laneName = 'Pushups'
    const emoji = '💪'
    const prompt = buildChallengePrompt(laneName, emoji)

    expect(prompt).toContain(laneName)
    expect(prompt).toContain(emoji)
  })

  it('the prompt forbids performance framing', () => {
    const prompt = buildChallengePrompt('Running', '🏃')
    
    // The AC specifies it must contain the exact phrase 'completable by showing up'
    // and explicitly forbids 'faster/heavier/better-than-last-time' framing.
    expect(prompt).toContain('completable by showing up')
    expect(prompt).toContain('NEVER use framing like faster, heavier, or better-than-last-time')
  })

  it('the prompt demands a short answer', () => {
    const prompt = buildChallengePrompt('Plank', '🧘')
    
    expect(prompt).toContain('Answer in 1-2 sentences with no preamble.')
  })
})
