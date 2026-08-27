import { auth } from "@/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export type Viewer =
  | { kind: "user"; userId: string; playerId: string }
  | { kind: "demo" };

/**
 * Who is looking at this page — a signed-in user, or nobody?
 *
 * Deliberately NOT a replacement for `requireUserId`. That one redirects and
 * is what every write goes through; this one tolerates a missing session and
 * is only ever used by pages, so a demo visitor can read without any path
 * existing by which they could write.
 *
 * Keeping the two apart is the whole safety argument for the public demo: an
 * action cannot accidentally become reachable by a stranger, because no action
 * imports this.
 *
 * The row is checked, not just the cookie. Sessions are JWTs, so a signed
 * cookie keeps naming a user for its full thirty-day window after the account
 * is deleted — and a second device would otherwise sit in a signed-in-but-empty
 * app rather than falling back to the demo like any other visitor.
 */
export async function getViewer(): Promise<Viewer> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { kind: "demo" };

  const stillExists = await prisma.user.count({ where: { id: userId } });
  if (stillExists !== 1) return { kind: "demo" };

  // Active player: cookie-validated first, oldest player as the fallback.
  // '' means "no players yet" — the layout's ensureDefaultPlayer closes that
  // window on the next request.
  let playerId = await getActivePlayerId(userId);
  if (playerId === null) {
    const oldest = await prisma.player.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    playerId = oldest?.id ?? "";
  }
  return { kind: "user", userId, playerId };
}

/**
 * The player named by the `x-active-player-id` cookie, IF this user owns it.
 * Ownership is validated so a stale or foreign cookie can never select
 * another account's player. Null when the cookie is absent or invalid.
 */
export async function getActivePlayerId(userId: string): Promise<string | null> {
  const cookieValue = (await cookies()).get("x-active-player-id")?.value;
  if (!cookieValue) return null;
  const row = await prisma.player.findFirst({
    where: { id: cookieValue, userId },
  });
  return row?.id ?? null;
}
