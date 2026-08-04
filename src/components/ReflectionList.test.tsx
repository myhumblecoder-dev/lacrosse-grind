import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ReflectionList renders', async () => {
    render(
      <ReflectionList reflections={reflections} editReflection={vi.fn()} deleteReflection={vi.fn()} />
    )
    expect(screen.getByText('Tough week but I kept showing up.')).toBeInTheDocument()
    expect(screen.getByText('Rested over the holidays.')).toBeInTheDocument()
  })

  it('renders the "This week" badge for current week reflections', async () => {
    const currentWeekReflections = [
      {
        id: 'r1',
        weekLabel: 'Mon 05 Jan 2026',
        playerNote: 'Note',
        coachSummary: null,
        isCurrentWeek: true,
      },
      {
        id: 'r2',
        weekLabel: 'Mon 29 Dec 2025',
        playerNote: 'Note',
        coachSummary: null,
        isCurrentWeek: false,
      },
    ]
    render(
      <ReflectionList reflections={currentWeekReflections} editReflection={vi.fn()} deleteReflection={vi.fn()} />
    )
    expect(screen.getByText('This week')).toBeInTheDocument()
    // Use queryByText with exact string to avoid the 'name' property error in typecheck
    // and to avoid the substring match error in the test runner.
    expect(screen.queryByText('Mon 29 Dec 2025')).toBeInTheDocument()
    // To verify the badge specifically isn't there for r2, we check the sibling text
    const r2Element = screen.getByText('Mon 29 Dec 2025').closest('li')
    expect(r2Element?.textContent).not.toContain('This week')
  })

  it('renders no badge for reflections without isCurrentWeek',
    async () => {
    render(
      <ReflectionList reflections={reflections} editReflection={vi.fn()} deleteReflection={vi.fn()} />
    )
    const badges = screen.queryAllByText('This week')
    expect(badges.length).toBe(0)
  })

  it('allows editing the current week reflection', async () => {
    const user = userEvent.setup()
    const currentWeekReflections = [
      {
        id: 'r1',
        weekLabel: 'Mon 05 Jan 2026',
        playerNote: 'Original',
        coachSummary: null,
        isCurrentWeek: true,
      },
    ]
    const editReflection = vi.fn().mockResolvedValue({ ok: true, coachSummary: 'New summary' })
    render(
      <ReflectionList
        reflections={currentWeekReflections}
        editReflection={editReflection}
        deleteReflection={vi.fn()}
      />
    )
    await user.click(screen.getByRole('button', { name: /edit reflection mon 05 jan 2026/i }))
    const textarea = screen.getByTestId('edit-reflection-r1')
    await user.clear(textarea)
    await user.type(textarea, 'Updated')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(editReflection).toHaveBeenCalledWith('r1', 'Updated')
    expect(await screen.findByText(/new summary/i)).toBeInTheDocument()
  })

  it('allows deleting the current week reflection', async () => {
    const user = userEvent.setup()
    const currentWeekReflections = [
      {
        id: 'r1',
        weekLabel: 'Mon 05 Jan 2026',
        playerNote: 'Original',
        coachSummary: null,
        isCurrentWeek: true,
      },
    ]
    const deleteReflection = vi.fn().mockResolvedValue({ ok: true })
    render(
      <ReflectionList
        reflections={currentWeekReflections}
        editReflection={vi.fn()}
        deleteReflection={deleteReflection}
      />
    )
    await user.click(screen.getByRole('button', { name: /delete reflection mon 05 jan 2026/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(deleteReflection).toHaveBeenCalledWith('r1')
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
