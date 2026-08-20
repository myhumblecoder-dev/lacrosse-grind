import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SeasonResetButton from './SeasonResetButton'
import { resetSeason } from '@/app/actions/resetSeason'

vi.mock('@/app/actions/resetSeason', () => ({ 
  resetSeason: vi.fn() 
}))

describe('SeasonResetButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resetSeason).mockResolvedValue(undefined)
  })

  it('the modal is closed until asked for', async () => {
    render(<SeasonResetButton />)
    expect(screen.queryByTestId('season-reset-modal')).toBeNull()
    expect(resetSeason).not.toHaveBeenCalled()
  })

  it('cancel keeps the season', async () => {
    const user = userEvent.setup()
    render(<SeasonResetButton />)
    await user.click(screen.getByTestId('season-reset-open'))
    await user.click(screen.getByTestId('season-reset-cancel'))
    expect(resetSeason).not.toHaveBeenCalled()
    expect(screen.queryByTestId('season-reset-modal')).toBeNull()
  })

  it('confirm resets exactly once', async () => {
    const user = userEvent.setup()
    render(<SeasonResetButton />)
    await user.click(screen.getByTestId('season-reset-open'))
    await user.click(screen.getByTestId('season-reset-confirm'))
    expect(resetSeason).toHaveBeenCalledTimes(1)
  })
})
