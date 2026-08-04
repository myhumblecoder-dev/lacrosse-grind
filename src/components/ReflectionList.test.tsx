import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReflectionList from './ReflectionList'

const reflections = [
  {
    id: 'r1',
    weekLabel: 'Mon 05 Jan 2026',
    playerNote: 'Tough week but I kept showing up.',
    coachSummary: 'You stayed consistent.',
  },
  {
    id: 'r2',
    weekLabel: 'Mon 29 Dec 2025',
    playerNote: 'Rested over the holidays.',
    coachSummary: null,
  },
]

describe('ReflectionList', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the empty state when there are no reflections', () => {
    render(
      <ReflectionList reflections={[]} editReflection={vi.fn()} deleteReflection={vi.fn()} />
    )
    expect(screen.getByText(/no past reflections yet/i)).toBeInTheDocument()
  })

  it('edits a reflection and shows the updated coach summary', async () => {
    const user = userEvent.setup()
    const editReflection = vi.fn().mockResolvedValue({ ok: true, coachSummary: 'Fresh summary.' })
    render(
      <ReflectionList
        reflections={reflections}
        editReflection={editReflection}
        deleteReflection={vi.fn()}
      />
    )
    await user.click(screen.getByRole('button', { name: /edit reflection mon 05 jan 2026/i }))
    const textarea = screen.getByTestId('edit-reflection-r1')
    await user.clear(textarea)
    await user.type(textarea, 'Rewrote my reflection')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(editReflection).toHaveBeenCalledWith('r1', 'Rewrote my reflection')
    expect(await screen.findByText(/fresh summary/i)).toBeInTheDocument()
  })

  it('deletes a reflection through the confirm modal', async () => {
    const user = userEvent.setup()
    const deleteReflection = vi.fn().mockResolvedValue({ ok: true })
    render(
      <ReflectionList
        reflections={reflections}
        editReflection={vi.fn()}
        deleteReflection={deleteReflection}
      />
    )
    await user.click(screen.getByRole('button', { name: /delete reflection mon 05 jan 2026/i }))
    // modal appears
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(deleteReflection).toHaveBeenCalledWith('r1')
  })

  it('cancel in the modal does not delete', async () => {
    const user = userEvent.setup()
    const deleteReflection = vi.fn()
    render(
      <ReflectionList
        reflections={reflections}
        editReflection={vi.fn()}
        deleteReflection={deleteReflection}
      />
    )
    await user.click(screen.getByRole('button', { name: /delete reflection mon 29 dec 2025/i }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(deleteReflection).not.toHaveBeenCalled()
  })
})
