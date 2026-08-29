import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import PlayerChooserClient from './PlayerChooserClient'
import { switchPlayer } from '@/app/actions/switchPlayer'

vi.mock('@/app/actions/switchPlayer', () => ({ switchPlayer: vi.fn() }))
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))

const players = [
  { id: 'p1', name: 'Alice', defeats: 0 },
  { id: 'p2', name: 'Bob', defeats: 9 },
  { id: 'p3', name: 'Cleo', defeats: 40 },
]

describe('PlayerChooserClient', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders a tile per player with their name', () => {
    render(<PlayerChooserClient players={players} manage={false} />)
    for (const p of players) {
      expect(screen.getAllByText(p.name).length).toBeGreaterThan(0)
    }
  })

  it('switches player and navigates home on tile tap', async () => {
    vi.mocked(switchPlayer).mockResolvedValue(undefined)
    render(<PlayerChooserClient players={players} manage={false} />)
    await userEvent.click(screen.getByRole('button', { name: /Bob/ }))
    await waitFor(() => expect(switchPlayer).toHaveBeenCalledWith('p2'))
    expect(push).toHaveBeenCalledWith('/')
  })

  it('opens the add modal from the plus tile', async () => {
    render(<PlayerChooserClient players={players} manage={false} />)
    await userEvent.click(screen.getByRole('button', { name: /add player/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders the manage panel instead of the grid in manage mode', () => {
    render(<PlayerChooserClient players={players} manage={true} />)
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /add player/i })).not.toBeInTheDocument()
  })
})
