import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ChoosePlayerAddModal from './ChoosePlayerAddModal'
import { createPlayer } from '@/app/actions/createPlayer'

vi.mock('@/app/actions/createPlayer', () => ({ createPlayer: vi.fn() }))
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

describe('ChoosePlayerAddModal', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders nothing when closed', () => {
    render(<ChoosePlayerAddModal open={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('disables submit for an empty name', () => {
    render(<ChoosePlayerAddModal open={true} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /add player/i })).toBeDisabled()
  })

  it('creates the player, refreshes, and closes on success', async () => {
    vi.mocked(createPlayer).mockResolvedValue({ ok: true, id: 'p9' })
    const onClose = vi.fn()
    render(<ChoosePlayerAddModal open={true} onClose={onClose} />)
    await userEvent.type(screen.getByPlaceholderText("Kid's name"), 'Maia')
    await userEvent.click(screen.getByRole('button', { name: /add player/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(createPlayer).toHaveBeenCalledWith('Maia')
    expect(refresh).toHaveBeenCalled()
  })

  it('shows the cap error inline and stays open', async () => {
    vi.mocked(createPlayer).mockResolvedValue({ ok: false, error: 'cap' })
    const onClose = vi.fn()
    render(<ChoosePlayerAddModal open={true} onClose={onClose} />)
    await userEvent.type(screen.getByPlaceholderText("Kid's name"), 'Seven')
    await userEvent.click(screen.getByRole('button', { name: /add player/i }))
    expect(await screen.findByText(/6-player limit/i)).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows the duplicate error inline', async () => {
    vi.mocked(createPlayer).mockResolvedValue({ ok: false, error: 'duplicate' })
    render(<ChoosePlayerAddModal open={true} onClose={vi.fn()} />)
    await userEvent.type(screen.getByPlaceholderText("Kid's name"), 'Eddie')
    await userEvent.click(screen.getByRole('button', { name: /add player/i }))
    expect(await screen.findByText(/already used/i)).toBeInTheDocument()
  })
})
