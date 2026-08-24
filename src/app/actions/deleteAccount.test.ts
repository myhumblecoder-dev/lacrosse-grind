import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { del, list } from '@vercel/blob'
import { requireUserId } from '@/lib/tenancy'
import { signOut } from '@/auth'
import { deleteAccount } from './deleteAccount'
import { DELETE_CONFIRMATION } from '@/lib/deleteConfirmation'

vi.mock('@/lib/db', () => ({
  prisma: {
    prize: { findUnique: vi.fn(), deleteMany: vi.fn() },
    lane: { deleteMany: vi.fn() },
    coachCall: { deleteMany: vi.fn() },
    user: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))
vi.mock('@vercel/blob', () => ({ del: vi.fn(), list: vi.fn() }))
vi.mock('@/lib/tenancy', () => ({ requireUserId: vi.fn() }))
vi.mock('@/auth', () => ({ signOut: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => { throw Object.assign(new Error('redirect'), { digest: 'NEXT_REDIRECT' }) }),
}))

/** Success leaves by redirect, which Next signals by throwing. */
const expectDeleted = async () => {
  await expect(deleteAccount(DELETE_CONFIRMATION)).rejects.toMatchObject({
    digest: 'NEXT_REDIRECT',
  })
}

describe('deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireUserId).mockResolvedValue('u1')
    vi.mocked(prisma.prize.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never)
    vi.mocked(list).mockResolvedValue({ blobs: [] } as never)
  })

  it('refuses without the typed word, and destroys nothing', async () => {
    const result = await deleteAccount('delete please')

    expect(result).toEqual({ ok: false, error: 'not-confirmed' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('names every table that does not cascade on its own', async () => {
    // Verified against a real database: deleting the User alone leaves the
    // lanes (orphaned), their check-ins, their battles, the prize and the
    // ledger all in place. Only Account and Session cascade.
    await expectDeleted()

    expect(prisma.lane.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    expect(prisma.prize.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    expect(prisma.coachCall.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    expect(prisma.user.deleteMany).toHaveBeenCalledWith({ where: { id: 'u1' } })
  })

  it('does it all at once, so a half-deleted account cannot survive', async () => {
    await expectDeleted()

    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(vi.mocked(prisma.$transaction).mock.calls[0][0]).toHaveLength(4)
  })

  it('deletes the prize photo, which no database row would take with it', async () => {
    vi.mocked(list).mockResolvedValue({
      blobs: [{ url: 'https://blob.test/u1/prize.jpg' }],
    } as never)

    await expectDeleted()

    expect(list).toHaveBeenCalledWith({ prefix: 'u1/' })
    expect(del).toHaveBeenCalledWith(['https://blob.test/u1/prize.jpg'])
  })

  it('still deletes the account when the blob store will not answer', async () => {
    // Refusing because a photo could not be removed would strand someone who
    // asked to leave.
    vi.mocked(list).mockRejectedValue(new Error('blob store unreachable'))

    await expectDeleted()

    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('removes the photo before the rows, not after', async () => {
    // The other order risks the worse failure: data gone, and a publicly
    // readable photo of a child left behind with nothing pointing at it.
    const order: string[] = []
    vi.mocked(list).mockResolvedValue({
      blobs: [{ url: 'https://blob.test/u1/prize.jpg' }],
    } as never)
    vi.mocked(del).mockImplementation(async () => { order.push('blob') })
    vi.mocked(prisma.$transaction).mockImplementation(async () => {
      order.push('rows'); return [] as never
    })

    await expectDeleted()

    expect(order).toEqual(['blob', 'rows'])
  })

  it('signs the person out once there is nothing left to be signed in to', async () => {
    await expectDeleted()

    expect(signOut).toHaveBeenCalledWith({ redirectTo: '/' })
  })

  it('needs a session, so nobody can delete an account by asking nicely', async () => {
    vi.mocked(requireUserId).mockRejectedValue(new Error('NEXT_REDIRECT'))

    await expect(deleteAccount(DELETE_CONFIRMATION)).rejects.toThrow()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
