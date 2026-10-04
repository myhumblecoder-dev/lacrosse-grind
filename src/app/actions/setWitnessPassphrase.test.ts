import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireUserId } from '@/lib/tenancy'
import { verifyWitnessPassphrase } from '@/lib/witnessPassphrase'
import { setWitnessPassphrase } from './setWitnessPassphrase'

vi.mock('@/lib/db', () => ({ prisma: { user: { update: vi.fn() } } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

// The real crypto runs: this test's whole job is proving the plaintext does not
// reach the column, which a mocked hash could not show.

describe('setWitnessPassphrase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
  })

  it('a passphrase below the minimum length is refused', async () => {
    const result = await setWitnessPassphrase('short')
    expect(result).toEqual({ ok: false, error: 'validation' })
  })

  it('does not write when validation fails', async () => {
    await setWitnessPassphrase('short')
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('a non-string is refused', async () => {
    const result = await setWitnessPassphrase(12345678)
    expect(result).toEqual({ ok: false, error: 'validation' })
  })

  it('writes to the signed-in user', async () => {
    await setWitnessPassphrase('watched him all week')
    expect(prisma.user.update).toHaveBeenCalledOnce()
    const arg = vi.mocked(prisma.user.update).mock.calls[0][0]
    expect(arg.where).toEqual({ id: 'u1' })
  })

  it('stores a hash, not the plaintext', async () => {
    await setWitnessPassphrase('watched him all week')
    const arg = vi.mocked(prisma.user.update).mock.calls[0][0]
    const stored = arg.data.witnessHash as string
    expect(stored).not.toBe('watched him all week')
    expect(stored).not.toContain('watched him all week')
    expect(stored).toContain(':')
  })

  it('stores a hash the real verifier accepts', async () => {
    await setWitnessPassphrase('watched him all week')
    const arg = vi.mocked(prisma.user.update).mock.calls[0][0]
    const stored = arg.data.witnessHash as string
    expect(verifyWitnessPassphrase('watched him all week', stored)).toBe(true)
    expect(verifyWitnessPassphrase('watched him all weel', stored)).toBe(false)
  })

  it('returns ok and revalidates /account on success', async () => {
    const result = await setWitnessPassphrase('watched him all week')
    expect(result).toEqual({ ok: true })
    expect(revalidatePath).toHaveBeenCalledWith('/account')
  })

  it('does not revalidate when validation fails', async () => {
    await setWitnessPassphrase('short')
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
