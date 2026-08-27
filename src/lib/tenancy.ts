import { auth } from "@/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

/**
 * The signed-in user, or a redirect to the sign-in screen.
 *
 * Every write goes through here. The row is checked rather than trusting the
 * cookie alone: sessions are JWTs, so a signed cookie keeps naming a user for
 * its full thirty-day window after the account is deleted, and a write on a
 * second device would otherwise fail on a foreign key instead of asking them
 * to sign in.
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;

  if (userId && (await prisma.user.count({ where: { id: userId } })) === 1) {
    return userId;
  }

  redirect("/signin");
  // The redirect function throws, so this line is unreachable.
  throw new Error("Redirected");
}
/**
 * The active player for this account, or a redirect home if none exist.
 *
 * Cookie first (`x-active-player-id`), validated against ownership so a stale
 * or foreign cookie can never leak another account's player; falls back to
 * the oldest player. Redirects only when the account has no players at all
 * (pre-`ensureDefaultPlayer` state).
 */
export async function requirePlayerId(userId: string): Promise<string> {
  const cookieValue = (await cookies()).get("x-active-player-id")?.value;
  if (cookieValue) {
    const owned = await prisma.player.findFirst({
      where: { id: cookieValue, userId },
    });
    if (owned) return owned.id;
  }
  const oldest = await prisma.player.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (oldest) return oldest.id;
  redirect("/");
  throw new Error("Redirected");
}
