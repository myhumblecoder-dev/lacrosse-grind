import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LaneList from './LaneList'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('LaneList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all lanes', async () => {
    const lanes = [
      { id: '1', name: 'Running', emoji: '🏃', isActive: true, targetPerWeek: 3 },
      { id: '2', name: 'Swimming', emoji: '🏊', isActive: false, targetPerWeek: 2 },
    ]
    render(<LaneList lanes={lanes} />)

    expect(screen.getByText('Running')).toBeInTheDocument()
    expect(screen.getByText('Swimming')).toBeInTheDocument()
    expect(screen.getByText('🏃')).toBeInTheDocument()
    expect(screen.getByText('🏊')).toBeInTheDocument()
  })

  it('active lane shows active badge', async () => {
    const lanes = [
      { id: '1', name: 'Running', emoji: '🏃', isActive: true, targetPerWeek: 3 },
    ]
    render(<LaneList lanes={lanes} />)

    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('inactive lane shows inactive badge', async () => {
    const lanes = [
      { id: '2', name: 'Swimming', emoji: '🏊', isActive: false, targetPerWeek: 2 },
    ]
    render(<LaneList lanes={lanes} />)

    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })
})
