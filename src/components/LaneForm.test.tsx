import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import LaneForm from './LaneForm'

describe('LaneForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders name input', () => {
    render(<LaneForm createLane={vi.fn()} />)
    expect(screen.getByTestId('lane-name-input')).toBeInTheDocument()
  })

  it('empty name submit shows validation error without calling action', async () => {
    const user = userEvent.setup()
    const createLane = vi.fn()
    render(<LaneForm createLane={createLane} />)

    await user.click(screen.getByRole('button', { name: 'Add Lane' }))

    expect(screen.getByText('Name is required')).toBeInTheDocument()
    expect(createLane).not.toHaveBeenCalled()
  })

  it('valid submit calls createLane and clears form', async () => {
    const user = userEvent.setup()
    const createLane = vi.fn().mockResolvedValue({ ok: true, id: 'lane-1' })
    render(<LaneForm createLane={createLane} />)

    const nameInput = screen.getByTestId('lane-name-input') as HTMLInputElement
    await user.type(nameInput, 'Stick Skills')
    await user.click(screen.getByRole('button', { name: 'Add Lane' }))

    expect(createLane).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Stick Skills', targetPerWeek: 5 })
    )
    await waitFor(() => expect(nameInput.value).toBe(''))
  })
})
