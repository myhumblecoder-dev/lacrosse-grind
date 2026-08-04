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

  it('renders lanes with active/inactive badges', () => {
    render(<LaneList lanes={LANES} {...actions()} />)
    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('Swimming')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('Toggle calls setActive with the flipped value', async () => {
    const user = userEvent.setup()
    const a = actions()
    render(<LaneList lanes={[LANES[0]]} {...a} />)
    await user.click(screen.getByRole('button', { name: /toggle/i }))
    expect(a.setActive).toHaveBeenCalledWith('1', false)
  })

  it('Delete calls deleteLane after confirm', async () => {
    const user = userEvent.setup()
    const a = actions()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<LaneList lanes={[LANES[0]]} {...a} />)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(a.deleteLane).toHaveBeenCalledWith('1')
  })

  it('Delete does nothing when confirm is cancelled', async () => {
    const user = userEvent.setup()
    const a = actions()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<LaneList lanes={[LANES[0]]} {...a} />)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(a.deleteLane).not.toHaveBeenCalled()
  })

  it('Edit then Save calls updateLane with the draft', async () => {
    const user = userEvent.setup()
    const a = actions()
    render(<LaneList lanes={[LANES[0]]} {...a} />)
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const nameInput = screen.getByTestId('edit-name-1')
    await user.clear(nameInput)
    await user.type(nameInput, 'Sprints')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(a.updateLane).toHaveBeenCalledWith('1', expect.objectContaining({ name: 'Sprints' }))
  })
})
