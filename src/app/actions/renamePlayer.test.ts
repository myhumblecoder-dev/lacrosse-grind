import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renamePlayer } from './renamePlayer'
import { prisma } from '@/lib/db'
import { requireUserId } from '@/lib/tenancy'

vi.mock('@/lib/db', () => ({
  prisma: { player: { findFirst: vi.fn(), update: vi.fn() } },
}))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('renamePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(prisma.player.findFirst).mockResolvedValue({ id: 'p1', userId: 'u1' } as never)
  })

  it('renames a player the user owns and returns ok', async () => {
    vi.mocked(prisma.player.update).mockResolvedValue({ id: 'p1' } as never)
    await expect(renamePlayer('p1', '  Eddie ')).resolves.toEqual({ ok: true })
    expect(prisma.player.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' }, data: { name: 'Eddie' } }))
  })

  it('rejects empty and over-40-char names without touching the db', async () => {
    await expect(renamePlayer('p1', '   ')).resolves.toEqual({ ok: false, error: 'validation' })
    await expect(renamePlayer('p1', 'x'.repeat(41))).resolves.toEqual({ ok: false, error: 'validation' })
    expect(prisma.player.update).not.toHaveBeenCalled()
  })

  it('returns not-found when the player does not belong to the user', async () => {
    vi.mocked(prisma.player.findFirst).mockResolvedValue(null as never)
    await expect(renamePlayer('p9', 'Eddie')).resolves.toEqual({ ok: false, error: 'not-found' })
    expect(prisma.player.update).not.toHaveBeenCalled()
  })

  it('returns duplicate when the name collides for this user (P2002)', async () => {
    vi.mocked(prisma.player.update).mockRejectedValue(
      Object.assign(new Error('unique'), { code: 'P2002' }))
    await expect(renamePlayer('p1', 'Taken')).resolves.toEqual({ ok: false, error: 'duplicate' })
  })
})
