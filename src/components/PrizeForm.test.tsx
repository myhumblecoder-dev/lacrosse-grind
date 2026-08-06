import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PrizeForm from './PrizeForm'

describe('PrizeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders seeded title and reasons', async () => {
    render(
      <PrizeForm
        existingTitle="PS5"
        existingDescription="The disc one"
        existingReasons={['I have wanted one for ages', 'Play with my team online']}
        savePrize={vi.fn()}
      />
    )

    expect(screen.getByTestId('prize-title')).toHaveValue('PS5')
    expect(screen.getByTestId('prize-description')).toHaveValue('The disc one')
    expect(screen.getByTestId('prize-reason-0')).toHaveValue('I have wanted one for ages')
    expect(screen.getByTestId('prize-reason-1')).toHaveValue('Play with my team online')
  })

  it('empty title blocks submit', async () => {
    const savePrize = vi.fn()
    render(<PrizeForm savePrize={savePrize} />)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Name the thing you want')
    expect(savePrize).not.toHaveBeenCalled()
  })

  it('add a reason appends an input', async () => {
    render(<PrizeForm existingTitle="PS5" existingReasons={['First reason']} savePrize={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'Add a reason' }))

    expect(screen.getByTestId('prize-reason-1')).toBeInTheDocument()
    expect(screen.getByTestId('prize-reason-1')).toHaveValue('')
  })

  it('remove drops the first reason', async () => {
    render(
      <PrizeForm
        existingTitle="PS5"
        existingReasons={['First reason', 'Second reason']}
        savePrize={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Remove reason 1' }))

    // Rows are keyed by position, so the survivor shifts up into index 0 —
    // assert on the remaining VALUE, never on a testid having disappeared.
    const remaining = screen.getAllByTestId(/^prize-reason-/)
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).toHaveValue('Second reason')
  })

  it('submit sends trimmed values', async () => {
    const savePrize = vi.fn().mockResolvedValue(undefined)
    render(
      <PrizeForm
        existingTitle="  PS5  "
        existingDescription="  The disc one  "
        existingReasons={['  Play online  ', '   ']}
        savePrize={savePrize}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(savePrize).toHaveBeenCalledTimes(1)
    expect(savePrize).toHaveBeenCalledWith({
      title: 'PS5',
      description: 'The disc one',
      reasons: ['Play online'],
    })
  })
})
