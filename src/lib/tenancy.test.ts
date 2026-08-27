import { describe, it, expect, vi } from 'vitest'
import { requireUserId, requirePlayerId } from './tenancy'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({ prisma: { user: { count: vi.fn() }, player: { findFirst: vi.fn() } } }))

vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw new Error('REDIRECT') }),
}))

// `auth` is overloaded in Auth.js, so vi.mocked(auth) resolves the
// middleware overload and rejects a session. Drive it through this:
//   mockAuth.mockResolvedValue({ user: { id: 'u1' } })
//   mockAuth.mockResolvedValue(null)
const mockAuth = vi.mocked(auth as unknown as () => Promise<unknown>)
const mockRedirect = vi.mocked(redirect)

describe('tenancy', () => {
  it('a session returns its user id', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } } as never)
    vi.mocked(prisma.user.count).mockResolvedValue(1)

    const userId = await requireUserId()

    expect(userId).toBe('u1')
    expect(mockAuth).toHaveBeenCalled()
  })

  it('no session redirects to signin', async () => {
    mockAuth.mockResolvedValue(null)

    await expect(requireUserId()).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/signin')
  })

  it('a session without an id redirects to signin', async () => {
    // Session exists but user object is missing id
    mockAuth.mockResolvedValue({ user: {} } as never)

    await expect(requireUserId()).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/signin')
  })
})

describe('requireUserId — a cookie is not proof the account exists', () => {
  it('sends a deleted account back to sign-in rather than trusting the JWT', async () => {
    // Sessions are JWTs, so a signed cookie keeps naming a user for its full
    // thirty-day window after the account is deleted. Without the row check a
    // write on a second device fails on a foreign key instead of asking them
    // to sign in.
    mockAuth.mockResolvedValue({ user: { id: 'gone' } } as never)
    vi.mocked(prisma.user.count).mockResolvedValue(0)

    await expect(requireUserId()).rejects.toThrow()
    expect(redirect).toHaveBeenCalledWith('/signin')
  })

  it('returns cookie player id when cookie names an owned player', async () => {
    vi.mocked(cookies).mockResolvedValue(
      { get: () => ({ value: 'player-1' }) } as unknown as Awaited<ReturnType<typeof cookies>>)
    vi.mocked(prisma.player.findFirst).mockResolvedValueOnce({ id: 'player-1' } as never)
    await expect(requirePlayerId('user-1')).resolves.toBe('player-1')
  })

  it('falls back to oldest player when cookie is absent', async () => {
    vi.mocked(cookies).mockResolvedValue(
      { get: () => undefined } as unknown as Awaited<ReturnType<typeof cookies>>)
    vi.mocked(prisma.player.findFirst).mockResolvedValueOnce({ id: 'player-2' } as never)
    await expect(requirePlayerId('user-1')).resolves.toBe('player-2')
  })

  it('redirects when no player rows exist for userId', async () => {
    vi.mocked(cookies).mockResolvedValue(
      { get: () => undefined } as unknown as Awaited<ReturnType<typeof cookies>>)
    vi.mocked(prisma.player.findFirst).mockResolvedValueOnce(null as never)
    vi.mocked(prisma.player.findFirst).mockResolvedValueOnce(null as never)
    await requirePlayerId('user-1').catch(() => undefined)
    expect(redirect).toHaveBeenCalledWith('/')
  })
})
