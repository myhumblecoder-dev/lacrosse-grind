'use server'

import { del, list } from '@vercel/blob'
import { prisma } from '@/lib/db'
import { requireUserId } from '@/lib/tenancy'
import { signOut } from '@/auth'
import { redirect } from 'next/navigation'
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
  // Only ever RETURNS on a refusal; success leaves by redirect.
  const userId = await requireUserId()

  if (confirmation !== DELETE_CONFIRMATION) {
    return { ok: false, error: 'not-confirmed' }
  }

  // The WHOLE prefix, not just the photo the prize currently points at.
  // `uploadPrizePhoto` deliberately swallows a failed delete when replacing a
  // picture, so a hiccup there leaves an older image orphaned under the same
  // prefix — publicly readable, with nothing referring to it. Those are
  // exactly what this is meant to remove.
  try {
    const { blobs } = await list({ prefix: `${userId}/` })
    if (blobs.length > 0) {
      await del(blobs.map((b) => b.url))
    }
  } catch (err) {
    // Best effort. Refusing to delete the account because a blob store was
    // briefly unreachable would strand someone who asked to leave.
    console.error(
      'Failed to delete stored photos during account deletion:',
      err instanceof Error ? err.message : err
    )
  }

  await prisma.$transaction([
    // Lanes first, and by hand: their check-ins, boss battles, freezes and
    // target changes cascade from the lane, not from the user.
    prisma.lane.deleteMany({ where: { userId } }),
    prisma.prize.deleteMany({ where: { userId } }),
    prisma.coachCall.deleteMany({ where: { userId } }),
    // deleteMany, not delete: sessions are JWTs, so a cookie on a second
    // device still resolves to this id after the row is gone. `delete` throws
    // P2025 on a missing row and would reject the whole transaction, turning
    // a second attempt into a crash instead of a no-op. Takes Account and
    // Session with it either way.
    prisma.user.deleteMany({ where: { id: userId } }),
  ])

  // The account is gone by this point. Whatever happens now, the person must
  // not be told it failed — that would invite a retry of something already
  // done. signOut throws its redirect on success, which is the intended exit.
  try {
    await signOut({ redirectTo: '/' })
  } catch (err) {
    if (isRedirect(err)) throw err
    console.error(
      'Sign-out after account deletion failed:',
      err instanceof Error ? err.message : err
    )
  }

  redirect('/')
}

/** Next signals a redirect by throwing, so it must never be swallowed. */
function isRedirect(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { digest?: unknown }).digest === 'string' &&
    (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}
