import { describe, it, expect, vi } from 'vitest'
import { signOutAction } from './signOutAction'
import { signOut } from '@/auth'

vi.mock('@/auth', () => ({
  signOut: vi.fn(),
}))

describe('signOutAction', () => {
  it('it signs out to the signin page', async () => {
    const mockSignOut = vi.mocked(signOut)
    mockSignOut.mockResolvedValue(undefined as any)

    await signOutAction()

    expect(mockSignOut).toHaveBeenCalledWith({
      redirectTo: '/signin',
    })
  })
})