import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deletePlayer } from './deletePlayer'
import { prisma } from '@/lib/db'
import { requireUserId } from '@/lib/tenancy'
import { cookies } from 'next/headers'

vi.mock('@/lib/db', () => ({
  prisma: { player: { findMany: vi.fn(), delete: vi.fn() } },
}))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const twoPlayers = [
  { id: 'p1', name: 'Alice', userId: 'u1' },
  { id: 'p2', name: 'Bob', userId: 'u1' },
]

describe('deletePlayer', () => {
  const cookieStore = { get: vi.fn(), delete: vi.fn() }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(prisma.player.findMany).mockResolvedValue(twoPlayers as never)
    vi.mocked(cookies).mockResolvedValue(cookieStore as unknown as Awaited<ReturnType<typeof cookies>>)
    cookieStore.get.mockReturnValue(undefined)
  })

  it('deletes on exact name confirmation and returns ok', async () => {
    await expect(deletePlayer('p1', 'Alice')).resolves.toEqual({ ok: true })
    expect(prisma.player.delete).toHaveBeenCalledWith({ where: { id: 'p1' } })
  })

  it('blocks deleting the last remaining player', async () => {
    vi.mocked(prisma.player.findMany).mockResolvedValue([twoPlayers[0]] as never)
    await expect(deletePlayer('p1', 'Alice')).resolves.toEqual({ ok: false, error: 'last-player' })
    expect(prisma.player.delete).not.toHaveBeenCalled()
  })

  it('rejects a wrong confirmation string', async () => {
    await expect(deletePlayer('p1', 'alice ')).resolves.toEqual({ ok: false, error: 'confirmation-mismatch' })
    expect(prisma.player.delete).not.toHaveBeenCalled()
  })

  it("returns not-found for another user's player", async () => {
    await expect(deletePlayer('p9', 'Alice')).resolves.toEqual({ ok: false, error: 'not-found' })
    expect(prisma.player.delete).not.toHaveBeenCalled()
  })

  it('clears the active-player cookie when the deleted player was active', async () => {
    cookieStore.get.mockReturnValue({ value: 'p1' })
    await expect(deletePlayer('p1', 'Alice')).resolves.toEqual({ ok: true })
    expect(cookieStore.delete).toHaveBeenCalledWith('x-active-player-id')
  })
})
