import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LaneList from './LaneList'

const LANES = [
  { id: '1', name: 'Running', emoji: '🏃', isActive: true, targetPerWeek: 3 },
  { id: '2', name: 'Swimming', emoji: '🏊', isActive: false, targetPerWeek: 2 },
]

const actions = () => ({ updateLane: vi.fn(), setActive: vi.fn(), deleteLane: vi.fn() })

describe('LaneList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders lanes with a toggle reflecting active state', () => {
    render(<LaneList lanes={LANES} {...actions()} />)
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('Swimming')).toBeInTheDocument()
    const switches = screen.getAllByRole('switch')
    expect(switches[0]).toHaveAttribute('aria-checked', 'true')
    expect(switches[1]).toHaveAttribute('aria-checked', 'false')
  })

  it('toggling the switch calls setActive with the flipped value', async () => {
    const user = userEvent.setup()
    const a = actions()
    render(<LaneList lanes={[LANES[0]]} {...a} />)
    await user.click(screen.getByRole('switch', { name: /toggle running/i }))
    expect(a.setActive).toHaveBeenCalledWith('1', false)
  })

  it('delete opens the confirm modal, and confirming calls deleteLane', async () => {
    const user = userEvent.setup()
    const a = actions()
    render(<LaneList lanes={[LANES[0]]} {...a} />)
    await user.click(screen.getByRole('button', { name: /delete running/i }))
    // custom modal, not window.confirm
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(a.deleteLane).toHaveBeenCalledWith('1')
  })

  it('cancelling the modal does not delete', async () => {
    const user = userEvent.setup()
    const a = actions()
    render(<LaneList lanes={[LANES[0]]} {...a} />)
    await user.click(screen.getByRole('button', { name: /delete running/i }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(a.deleteLane).not.toHaveBeenCalled()
  })

  it('edit then save calls updateLane with the draft', async () => {
    const user = userEvent.setup()
    const a = actions()
    render(<LaneList lanes={[LANES[0]]} {...a} />)
    await user.click(screen.getByRole('button', { name: /edit running/i }))
    const nameInput = screen.getByTestId('edit-name-1')
    await user.clear(nameInput)
    await user.type(nameInput, 'Sprints')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(a.updateLane).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'Sprints' }))
  })
})
