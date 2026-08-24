'use server'

import { del } from '@vercel/blob'
import { prisma } from '@/lib/db'
import { requireUserId } from '@/lib/tenancy'
import { signOut } from '@/auth'
import { DELETE_CONFIRMATION } from '@/lib/deleteConfirmation'

/**
 * Remove an account and everything belonging to it.
 *
 * Deleting the User row is NOT enough, and quietly so. `Lane.user` and
 * `Prize.user` are optional relations with no `onDelete`, which Prisma
 * defaults to SetNull — so deleting the user orphans the lanes rather than
 * removing them, and every check-in and boss battle hanging off them survives
 * with a null owner. `CoachCall` has no relation at all. Verified against a
 * real database: a plain `user.delete` left the lane, its check-ins, its
 * battles, the prize and the ledger all in place.
 *
 * So everything is named explicitly. Only `Account` and `Session` cascade on
 * their own, and only because those relations say so.
 *
 * The photo goes first. If the database call fails afterwards the person keeps
 * their account and loses a picture, which is a worse day than they wanted but
 * a recoverable one. The other order risks the opposite: data deleted, and a
 * publicly readable photo of a child left behind with nothing pointing at it.
 */
export async function deleteAccount(
  confirmation: string
): Promise<{ ok: false; error: string }> {
  const userId = await requireUserId()

  if (confirmation !== DELETE_CONFIRMATION) {
    return { ok: false, error: 'not-confirmed' }
  }

  const prize = await prisma.prize.findUnique({ where: { userId } })
  if (prize?.photoUrl) {
    try {
      await del(prize.photoUrl)
    } catch (err) {
      // Best effort. Refusing to delete the account because a blob store was
      // briefly unreachable would strand someone who asked to leave.
      console.error(
        'Failed to delete prize photo during account deletion:',
        err instanceof Error ? err.message : err
      )
    }
  }

  await prisma.$transaction([
    // Lanes first, and by hand: their check-ins, boss battles, freezes and
    // target changes cascade from the lane, not from the user.
    prisma.lane.deleteMany({ where: { userId } }),
    prisma.prize.deleteMany({ where: { userId } }),
    prisma.coachCall.deleteMany({ where: { userId } }),
    // Takes Account and Session with it.
    prisma.user.delete({ where: { id: userId } }),
  ])

  // Throws a redirect, so nothing may follow it.
  await signOut({ redirectTo: '/' })
  return { ok: false, error: 'unreachable' }
}
