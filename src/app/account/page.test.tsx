import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Page from './page'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: vi.fn() } } }))
// The real redirect throws to stop rendering, so the mock does too — a no-op
// mock would let the page run on and read `session.user.id` off null.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error('NEXT_REDIRECT:' + path)
  }),
}))
vi.mock('@/app/actions/deleteAccount', () => ({ deleteAccount: vi.fn() }))
vi.mock('@/app/actions/setWitnessPassphrase', () => ({ setWitnessPassphrase: vi.fn() }))

const session = { user: { id: 'u1', email: 'parent@example.com' } }

describe('AccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue(session as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: null } as never)
  })

  it('sends a visitor with no session to sign in', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)

    await expect(Page()).rejects.toThrow('NEXT_REDIRECT:/signin')
    expect(redirect).toHaveBeenCalledWith('/signin')
  })

  it('does not read the account when there is no session', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)

    await expect(Page()).rejects.toThrow()
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('reads only whether a passphrase exists, scoped to the signed-in user', async () => {
    render(await Page())
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { witnessHash: true },
    })
  })

  it('offers to set a first passphrase when none exists', async () => {
    render(await Page())
    expect(screen.getByTestId('witness-passphrase-submit')).toHaveTextContent('Set passphrase')
  })

  it('offers to change the passphrase when one is already set', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: 'salt:hash' } as never)
    render(await Page())
    expect(screen.getByTestId('witness-passphrase-submit')).toHaveTextContent('Change passphrase')
  })

  it('never renders the stored hash', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ witnessHash: 'salt:secrethash' } as never)
    const { container } = render(await Page())
    expect(container.innerHTML).not.toContain('secrethash')
  })

  it('still renders the delete account panel', async () => {
    render(await Page())
    expect(screen.getByTestId('delete-account')).toBeInTheDocument()
  })

  it('names the signed-in email', async () => {
    render(await Page())
    expect(screen.getByText('parent@example.com')).toBeInTheDocument()
  })
})
