import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BossBattleForm from './BossBattleForm'

const baseProps = {
  laneId: 'lane-1',
  laneName: 'Shooting',
  weekStarting: new Date(Date.UTC(2026, 0, 5)),
}

describe('BossBattleForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders textarea and submit button', () => {
    render(<BossBattleForm {...baseProps} createBossBattle={vi.fn()} />)
    expect(screen.getByTestId('self-report-input')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit Battle Report' })).toBeInTheDocument()
  })

  it('empty submit shows validation message without calling action', async () => {
    const user = userEvent.setup()
    const createBossBattle = vi.fn()
    render(<BossBattleForm {...baseProps} createBossBattle={createBossBattle} />)

    await user.click(screen.getByRole('button', { name: 'Submit Battle Report' }))

    expect(screen.getByText('Tell me how it went first')).toBeInTheDocument()
    expect(createBossBattle).not.toHaveBeenCalled()
  })

  it('valid submit calls createBossBattle and shows coach note', async () => {
    const user = userEvent.setup()
    const createBossBattle = vi.fn().mockResolvedValue({ coachNote: 'Keep showing up.' })
    render(<BossBattleForm {...baseProps} createBossBattle={createBossBattle} />)

    await user.type(screen.getByTestId('self-report-input'), 'Worked my off-hand.')
    await user.click(screen.getByRole('button', { name: 'Submit Battle Report' }))

    await waitFor(() =>
      expect(createBossBattle).toHaveBeenCalledWith({
        laneId: 'lane-1',
        weekStarting: baseProps.weekStarting,
        selfReport: 'Worked my off-hand.',
      })
    )
    expect(await screen.findByTestId('coach-note')).toHaveTextContent('Keep showing up.')
  })
})
