import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PlayerSwitcher from './PlayerSwitcher'

describe('PlayerSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders null when players array has one entry', async () => {
    const players = [{ id: 'p1', name: 'Player One' }]
    const switchPlayer = vi.fn()
    const { container } = render(
      <PlayerSwitcher players={players} activePlayerId="p1" switchPlayer={switchPlayer} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders select with all player names when two entries', async () => {
    const players = [
      { id: 'p1', name: 'Player One' },
      { id: 'p2', name: 'Player Two' },
    ]
    const switchPlayer = vi.fn()
    render(
      <PlayerSwitcher players={players} activePlayerId="p1" switchPlayer={switchPlayer} />
    )
    const select = screen.getByTestId('player-switcher')
    expect(select).toBeInTheDocument()
    expect(select).toHaveValue('p1')
    expect(screen.getByRole('option', { name: 'Player One' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Player Two' })).toBeInTheDocument()
  })

  it('onChange calls switchPlayer with selected player id', async () => {
    const players = [
      { id: 'p1', name: 'Player One' },
      { id: 'p2', name: 'Player Two' },
    ]
    const switchPlayer = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <PlayerSwitcher players={players} activePlayerId="p1" switchPlayer={switchPlayer} />
    )
    const select = screen.getByTestId('player-switcher')
    await user.selectOptions(select, 'p2')
    expect(switchPlayer).toHaveBeenCalledWith('p2')
  })
})