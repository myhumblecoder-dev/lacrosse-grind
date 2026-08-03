import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ReflectionForm from './ReflectionForm'

describe('ReflectionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders textarea and submit button', async () => {
    const weekStarting = new Date('2024-01-01')
    const createReflection = vi.fn()
    render(<ReflectionForm weekStarting={weekStarting} createReflection={createReflection} />)

    expect(screen.getByTestId('reflection-input')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Reflection' })).toBeInTheDocument()
  })

  it('empty submit shows validation message without calling action', async () => {
    const user = userEvent.setup()
    const weekStarting = new Date('2024-01-01')
    const createReflection = vi.fn()
    render(<ReflectionForm weekStarting={weekStarting} createReflection={createReflection} />)

    const textarea = screen.getByTestId('reflection-input')
    await user.clear(textarea)
    await user.tab()

    await user.click(screen.getByRole('button', { name: 'Save Reflection' }))

    expect(screen.getByText('Share something about your week')).toBeInTheDocument()
    expect(createReflection).not.toHaveBeenCalled()
  })

  it('valid submit calls createReflection and shows coach summary', async () => {
    const user = userEvent.setup()
    const weekStarting = new Date('2024-01-01')
    const createReflection = vi.fn().mockResolvedValue({
      coachSummary: 'Great job this week!',
    })
    render(<ReflectionForm weekStarting={weekStarting} createReflection={createReflection} />)

    const textarea = screen.getByTestId('reflection-input')
    await user.type(textarea, 'I worked hard on my lanes.')
    await user.click(screen.getByRole('button', { name: 'Save Reflection' }))

    expect(await screen.findByTestId('coach-summary')).toHaveTextContent('🧠 Coach says: Great job this week!')
    expect(createReflection).toHaveBeenCalledWith({
      weekStarting,
      playerNote: 'I worked hard on my lanes.',
    })
  })
})
