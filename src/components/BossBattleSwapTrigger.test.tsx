import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BossBattleSwapTrigger from './BossBattleSwapTrigger'

const LANE = { id: '1', name: 'Stick Skills', emoji: '🥍' }
const INACTIVE = [{ id: '9', name: 'Running', emoji: '🏃' }]

const props = (swapState: {
  mustPickReplacement: boolean
  canRetire: boolean
  blocked: boolean
}) => ({
  lane: LANE,
  inactiveLanes: INACTIVE,
  swapState,
  onSwapLane: vi.fn(),
})

describe('BossBattleSwapTrigger', () => {
  beforeEach(() => vi.clearAllMocks())

  it('offers the trade once the battle is done', () => {
    render(
      <BossBattleSwapTrigger
        {...props({ mustPickReplacement: false, canRetire: true, blocked: false })}
      />
    )

    expect(screen.getByTestId('trade-btn-1')).toBeInTheDocument()
  })

  it('offers nothing when the season would not allow the change', () => {
    // An offer Eddie cannot accept is worse than no offer.
    render(
      <BossBattleSwapTrigger
        {...props({ mustPickReplacement: false, canRetire: false, blocked: true })}
      />
    )

    expect(screen.queryByTestId('trade-btn-1')).not.toBeInTheDocument()
  })

  it('trades the lane through the action when confirmed', async () => {
    const user = userEvent.setup()
    const p = props({ mustPickReplacement: false, canRetire: true, blocked: false })
    render(<BossBattleSwapTrigger {...p} />)

    await user.click(screen.getByTestId('trade-btn-1'))
    await user.click(screen.getByTestId('confirm-swap'))

    expect(p.onSwapLane).toHaveBeenCalledWith('1')
  })
})
