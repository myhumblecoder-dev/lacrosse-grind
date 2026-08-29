import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ChoosePlayerPage from './page'
import { prisma } from '@/lib/db'
import { requireUserId } from '@/lib/tenancy'

vi.mock('@/lib/db', () => ({
  prisma: { player: { findMany: vi.fn() }, bossBattle: { count: vi.fn() } },
}))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))
vi.mock('@/app/actions/switchPlayer', () => ({ switchPlayer: vi.fn() }))
vi.mock('@/app/actions/renamePlayer', () => ({ renamePlayer: vi.fn() }))
vi.mock('@/app/actions/deletePlayer', () => ({ deletePlayer: vi.fn() }))
vi.mock('@/app/actions/createPlayer', () => ({ createPlayer: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

describe('ChoosePlayerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(prisma.player.findMany).mockResolvedValue(
      [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }] as never)
    vi.mocked(prisma.bossBattle.count).mockResolvedValue(2 as never)
  })

  it('renders a tile per fetched player', async () => {
    render(await ChoosePlayerPage({ searchParams: Promise.resolve({}) }))
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0)
    expect(prisma.bossBattle.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ lane: { playerId: 'p1' } }) }))
  })

  it('renders the manage panel when mode=manage', async () => {
    render(await ChoosePlayerPage({ searchParams: Promise.resolve({ mode: 'manage' }) }))
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument()
  })
})
