import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RootLayout from './layout'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { ensureDefaultPlayer } from '@/app/actions/ensureDefaultPlayer'

// next/font's loader only exists inside the Next build; under vitest
// `Geist(...)` is not a function and the suite dies at module load.
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'mock-font-variable', className: 'mock-font' }),
  Geist_Mono: () => ({ variable: 'mock-font-variable', className: 'mock-font' }),
}))
vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({ prisma: { player: { findMany: vi.fn() } } }))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('@/app/actions/ensureDefaultPlayer', () => ({ ensureDefaultPlayer: vi.fn() }))
vi.mock('@/app/actions/switchPlayer', () => ({ switchPlayer: vi.fn() }))

import { cookies } from 'next/headers'

describe('RootLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.player.findMany).mockResolvedValue(
      [{ id: 'p1', name: 'Eddie' }] as never)
    vi.mocked(cookies).mockResolvedValue(
      { get: vi.fn().mockReturnValue(undefined) } as unknown as Awaited<ReturnType<typeof cookies>>)
  })

  it('renders AppShell without player switcher and without ensureDefaultPlayer when no session', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)

    render(await RootLayout({ children: <div>content</div> }))

    expect(ensureDefaultPlayer).not.toHaveBeenCalled()
    expect(screen.queryByTestId('player-switcher')).not.toBeInTheDocument()
  })

  it('calls ensureDefaultPlayer and renders the player switcher when session exists', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never)

    render(await RootLayout({ children: <div>content</div> }))

    expect(ensureDefaultPlayer).toHaveBeenCalledOnce()
    expect(prisma.player.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }))
  })
})
