import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SeasonStartButton from './SeasonStartButton'
import { startSeason } from '@/app/actions/startSeason'
import { resetSeason } from '@/app/actions/resetSeason'

vi.mock('@/app/actions/startSeason', () => ({
  startSeason: vi.fn(),
}))

vi.mock('@/app/actions/resetSeason', () => ({
  resetSeason: vi.fn(),
}))

describe('SeasonStartButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('not started and not ready renders a disabled start button', async () => {
    render(<SeasonStartButton hasStarted={false} isReady={false} />)
    const button = screen.getByTestId('season-start')
    expect(button).toBeInTheDocument()
    expect(button).toBeDisabled()
    expect(button).toHaveClass('bg-green-600')
  })

  it('not started and ready calls startSeason when clicked', async () => {
    const user = userEvent.setup()
    render(<SeasonStartButton hasStarted={false} isReady={true} />)
    const button = screen.getByTestId('season-start')
    expect(button).not.toBeDisabled()
    await user.click(button)
    expect(startSeason).toHaveBeenCalled()
  })

  it('started renders the reset button and calls resetSeason when clicked', async () => {
    const user = userEvent.setup()
    render(<SeasonStartButton hasStarted={true} isReady={true} />)
    const button = screen.getByTestId('season-reset')
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-red-600')
    await user.click(button)
    expect(resetSeason).toHaveBeenCalled()
  })
})
