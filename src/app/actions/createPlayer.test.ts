import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPlayer } from './createPlayer'
import { prisma } from '@/lib/db'
import { requireUserId } from '@/lib/tenancy'

vi.mock('@/lib/db', () => ({
  prisma: { player: { create: vi.fn(), count: vi.fn().mockResolvedValue(0) } },
}))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))

describe('createPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(prisma.player.count).mockResolvedValue(0)
  })

  it('returns ok:false for empty and whitespace-only names', async () => {
    await expect(createPlayer('')).resolves.toEqual({ ok: false, error: 'validation' })
    await expect(createPlayer('   ')).resolves.toEqual({ ok: false, error: 'validation' })
    expect(prisma.player.create).not.toHaveBeenCalled()
  })

  it('returns ok:false error cap when the account already has 6 players', async () => {
    vi.mocked(prisma.player.count).mockResolvedValue(6)
    await expect(createPlayer('Eddie')).resolves.toEqual({ ok: false, error: 'cap' })
    expect(prisma.player.create).not.toHaveBeenCalled()
  })

  it('returns ok:true with row id for valid input', async () => {
    vi.mocked(prisma.player.create).mockResolvedValue({ id: 'p9' } as never)
    await expect(createPlayer('  Eddie ')).resolves.toEqual({ ok: true, id: 'p9' })
    expect(prisma.player.create).toHaveBeenCalledOnce()
    const arg = vi.mocked(prisma.player.create).mock.calls[0][0]
    expect(arg.data).toEqual({ userId: 'u1', name: 'Eddie', isDefault: false })
  })
  it('returns duplicate when the name collides for this user (P2002)', async () => {
    vi.mocked(prisma.player.create).mockRejectedValue(
      Object.assign(new Error('unique'), { code: 'P2002' }))
    await expect(createPlayer('Eddie')).resolves.toEqual({ ok: false, error: 'duplicate' })
  })
})
