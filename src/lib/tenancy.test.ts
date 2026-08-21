import { describe, it, expect, vi } from 'vitest'
import { requireUserId } from './tenancy'

import { auth } from '@/auth'
import { redirect } from 'next/navigation'

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

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
