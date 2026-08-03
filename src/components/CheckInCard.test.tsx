import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CheckInCard from './CheckInCard'

describe('CheckInCard', () => {
  const mockLane = { id: 'lane-1', name: 'Running', emoji: '🏃' }
  const mockCreateCheckIn = vi.fn()
  const mockDeleteCheckIn = vi.fn()
  const defaultProps = {
    lane: mockLane,
    streak: 5,
    checkedIn: false,
    isRest: false,
    today: '2024-01-01T00:00:00.000Z',
    createCheckIn: mockCreateCheckIn,
    deleteCheckIn: mockDeleteCheckIn,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders lane name and emoji', async () => {
    render(<CheckInCard {...defaultProps} />)
    expect(screen.getByText(mockLane.name)).toBeInTheDocument()
    expect(screen.getByText(mockLane.emoji)).toBeInTheDocument()
  })

  it('hit button calls createCheckIn with isRest false', async () => {
    const user = userEvent.setup()
    render(<CheckInCard {...defaultProps} />)
    const hitButton = screen.getByRole('button', { name: 'I showed up' })
    await user.click(hitButton)
    expect(mockCreateCheckIn).toHaveBeenCalledWith({
      laneId: mockLane.id,
      date: new Date(defaultProps.today),
      isRest: false,
    })
  })

  it('rest button calls createCheckIn with isRest true', async () => {
    const user = userEvent.setup()
    render(<CheckInCard {...defaultProps} />)
    const restButton = screen.getByRole('button', { name: 'Rest day' })
    await user.click(restButton)
    expect(mockCreateCheckIn).toHaveBeenCalledWith({
      laneId: mockLane.id,
      date: new Date(defaultProps.today),
      isRest: true,
    })
  })

  it('undo button renders only when checkedIn true', async () => {
    const { rerender } = render(<CheckInCard {...defaultProps} />)
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()

    rerender(<CheckInCard {...defaultProps} checkedIn={true} />)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
  })

  it('hit and rest buttons disabled when checkedIn true', async () => {
    render(<CheckInCard {...defaultProps} checkedIn={true} />)
    expect(screen.queryByRole('button', { name: 'I showed up' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rest day' })).toBeNull()
  })
}) 