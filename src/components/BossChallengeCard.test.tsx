import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BossChallengeCard from './BossChallengeCard'

describe('BossChallengeCard', () => {
  const defaultProps = {
    challenge: null,
    rerolled: false,
    completedAt: null,
    coachNote: null,
    onFace: vi.fn(),
    onReroll: vi.fn(),
    onComplete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('no challenge shows only Face the boss', async () => {
    render(<BossChallengeCard {...defaultProps} />)
    expect(screen.getByTestId('face-boss')).toBeInTheDocument()
    expect(screen.getByText('Face the boss')).toBeInTheDocument()
    expect(screen.queryByTestId('boss-challenge')).toBeNull()
    expect(screen.queryByTestId('beat-boss')).toBeNull()
  })

  it('an active challenge shows beat and reroll buttons', async () => {
    render(
      <BossChallengeCard
        {...defaultProps}
        challenge="Do 10 pushups"
        rerolled={false}
      />
    )
    expect(screen.getByTestId('boss-challenge')).toHaveTextContent('Do 10 pushups')
    expect(screen.getByTestId('beat-boss')).toBeInTheDocument()
    expect(screen.getByTestId('reroll-boss')).toBeInTheDocument()
  })

  it('a rerolled challenge hides the reroll button', async () => {
    render(
      <BossChallengeCard
        {...defaultProps}
        challenge="Do 10 pushups"
        rerolled={true}
      />
    )
    expect(screen.getByTestId('boss-challenge')).toHaveTextContent('Do 10 pushups')
    expect(screen.getByTestId('beat-boss')).toBeInTheDocument()
    expect(screen.queryByTestId('reroll-boss')).toBeNull()
  })

  it('a defeated boss shows the note and no buttons', async () => {
    render(
      <BossChallengeCard
        {...defaultProps}
        challenge="Do 10 pushups"
        completedAt={new Date()}
        coachNote="Great job!"
      />
    )
    expect(screen.getByTestId('boss-defeated')).toHaveTextContent('Boss defeated! Do 10 pushups')
    expect(screen.getByTestId('coach-note')).toHaveTextContent('Great job!')
    expect(screen.queryByTestId('beat-boss')).toBeNull()
    expect(screen.queryByTestId('reroll-boss')).toBeNull()
    expect(screen.queryByTestId('face-boss')).toBeNull()
  })
})
