import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LaneSwapModal from './LaneSwapModal'

describe('LaneSwapModal', () => {
  const defaultProps = {
    open: true,
    outLane: { id: '1', name: 'Stick Skills', emoji: '🥍' },
    inactiveLanes: [{ id: '2', name: 'Running', emoji: '🏃' }],
    mustPickReplacement: false,
    canRetire: true,
    onSwap: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when closed', async () => {
    render(<LaneSwapModal {...defaultProps} open={false} />)
    const dialog = screen.queryByRole('dialog')
    expect(dialog).toBeNull()
  })

  it('renders dialog heading when open', async () => {
    render(<LaneSwapModal {...defaultProps} />)
    expect(screen.getByRole('heading', { name: 'Trade out 🥍 Stick Skills' })).toBeInTheDocument()
  })

  it('cancel button calls onCancel', async () => {
    const user = (await import('@testing-library/user-event')).default.setup()
    render(<LaneSwapModal {...defaultProps} />)
    const cancelButton = screen.getByTestId('cancel-swap')
    await user.click(cancelButton)
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('disables confirm until a replacement is chosen', async () => {
    render(<LaneSwapModal {...defaultProps} mustPickReplacement={true} canRetire={false} />)

    expect(screen.getByTestId('confirm-swap')).toBeDisabled()
  })

  it('confirms a swap with the lane Eddie picked', async () => {
    const user = userEvent.setup()
    render(<LaneSwapModal {...defaultProps} mustPickReplacement={true} canRetire={false} />)

    await user.selectOptions(screen.getByTestId('replacement-select'), '2')
    await user.click(screen.getByTestId('confirm-swap'))

    expect(defaultProps.onSwap).toHaveBeenCalledWith('1', '2')
  })

  it('retires with no replacement when above the floor', async () => {
    const user = userEvent.setup()
    render(<LaneSwapModal {...defaultProps} mustPickReplacement={false} canRetire={true} />)

    await user.click(screen.getByTestId('confirm-swap'))

    // Exactly one argument: a retire is not a swap to `undefined`.
    expect(defaultProps.onSwap).toHaveBeenCalledWith('1')
  })
})
