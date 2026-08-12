import { render, screen } from '@testing-library/react'
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
})
