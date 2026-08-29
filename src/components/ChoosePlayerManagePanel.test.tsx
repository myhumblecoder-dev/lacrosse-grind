import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ChoosePlayerManagePanel from './ChoosePlayerManagePanel'
import { renamePlayer } from '@/app/actions/renamePlayer'
import { deletePlayer } from '@/app/actions/deletePlayer'

vi.mock('@/app/actions/renamePlayer', () => ({ renamePlayer: vi.fn() }))
vi.mock('@/app/actions/deletePlayer', () => ({ deletePlayer: vi.fn() }))
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }))

const twoPlayers = [
  { id: 'p1', name: 'Alice' },
  { id: 'p2', name: 'Bob' },
]

describe('ChoosePlayerManagePanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders a rename and a delete control per player', () => {
    render(<ChoosePlayerManagePanel players={twoPlayers} onManageDone={vi.fn()} />)
    expect(screen.getAllByRole('button', { name: /rename/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(2)
  })

  it('renames via the action with the typed name', async () => {
    vi.mocked(renamePlayer).mockResolvedValue({ ok: true })
    render(<ChoosePlayerManagePanel players={twoPlayers} onManageDone={vi.fn()} />)
    await userEvent.click(screen.getAllByRole('button', { name: /rename/i })[0])
    const input = screen.getByDisplayValue('Alice')
    await userEvent.clear(input)
    await userEvent.type(input, 'Ally')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => expect(renamePlayer).toHaveBeenCalledWith('p1', 'Ally'))
    expect(refresh).toHaveBeenCalled()
  })

  it('shows the duplicate error inline on rename', async () => {
    vi.mocked(renamePlayer).mockResolvedValue({ ok: false, error: 'duplicate' })
    render(<ChoosePlayerManagePanel players={twoPlayers} onManageDone={vi.fn()} />)
    await userEvent.click(screen.getAllByRole('button', { name: /rename/i })[0])
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(await screen.findByText(/already used/i)).toBeInTheDocument()
  })

  it('deletes via the action with the typed confirmation', async () => {
    vi.mocked(deletePlayer).mockResolvedValue({ ok: true })
    render(<ChoosePlayerManagePanel players={twoPlayers} onManageDone={vi.fn()} />)
    await userEvent.click(screen.getAllByRole('button', { name: /delete/i })[0])
    await userEvent.type(screen.getByLabelText(/type .* name/i), 'Alice')
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }))
    await waitFor(() => expect(deletePlayer).toHaveBeenCalledWith('p1', 'Alice'))
  })

  it('disables delete for the last remaining player', () => {
    render(<ChoosePlayerManagePanel players={[twoPlayers[0]]} onManageDone={vi.fn()} />)
    expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled()
  })
})
