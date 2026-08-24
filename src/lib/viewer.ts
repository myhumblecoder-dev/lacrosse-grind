import { auth } from "@/auth";

export type Viewer = { kind: "user"; userId: string } | { kind: "demo" };

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
 */
export async function getViewer(): Promise<Viewer> {
  const session = await auth();
  const userId = session?.user?.id;

  return userId ? { kind: "user", userId } : { kind: "demo" };
}
