import { describe, expect, it, vi, beforeEach } from "vitest";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getViewer, getActivePlayerId } from "@/lib/viewer";
import { cookies } from "next/headers";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { user: { count: vi.fn() }, player: { findFirst: vi.fn() } } }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

describe("getViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: the account named by the cookie still exists.
    vi.mocked(prisma.user.count).mockResolvedValue(1);
    // Default: no active-player cookie; oldest-player fallback finds p1.
    vi.mocked(cookies).mockResolvedValue(
      { get: vi.fn().mockReturnValue(undefined) } as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(prisma.player.findFirst).mockResolvedValue({ id: "p1" } as never);
  });

  it("reports the signed-in user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);

    expect(await getViewer()).toEqual({ kind: "user", userId: "u1", playerId: "p1" });
  });

  it("reports a demo viewer when there is no session", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    expect(await getViewer()).toEqual({ kind: "demo" });
  });

  it("never redirects — that is what makes the demo browsable", async () => {
    // requireUserId redirects and still guards every write. This one must not,
    // or a signed-out visitor is bounced off the pages they came to look at.
    vi.mocked(auth).mockResolvedValue(null as never);

    await getViewer();

    expect(redirect).not.toHaveBeenCalled();
  });

  it("treats a session with no id as demo rather than trusting it", async () => {
    // The id is copied onto the session by a callback; if that ever breaks,
    // fall back to the demo rather than querying with undefined.
    vi.mocked(auth).mockResolvedValue({ user: {} } as never);

    expect(await getViewer()).toEqual({ kind: "demo" });
  });
});

describe("getViewer — a cookie is not proof the account exists", () => {
  beforeEach(() => vi.clearAllMocks());

  it("falls back to the demo for a deleted account", async () => {
    // Otherwise a second device sits in a signed-in-but-empty app for the
    // full thirty-day JWT window rather than seeing what any visitor sees.
    vi.mocked(auth).mockResolvedValue({ user: { id: "gone" } } as never);
    vi.mocked(prisma.user.count).mockResolvedValue(0);

    expect(await getViewer()).toEqual({ kind: "demo" });
  });

  it("does not ask the database when there is no session at all", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    await getViewer();

    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it("getActivePlayerId returns null when cookie absent", async () => {
    vi.mocked(cookies).mockResolvedValue(
      { get: vi.fn().mockReturnValue(undefined) } as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(prisma.player.findFirst).mockClear();

    expect(await getActivePlayerId("user-1")).toBeNull();
    expect(prisma.player.findFirst).not.toHaveBeenCalled();
  });

  it("getActivePlayerId returns playerId when cookie matches owner", async () => {
    vi.mocked(cookies).mockResolvedValue(
      { get: vi.fn().mockReturnValue({ value: "player-abc" }) } as unknown as Awaited<ReturnType<typeof cookies>>);
    vi.mocked(prisma.player.findFirst).mockResolvedValue(
      { id: "player-abc", userId: "user-1", createdAt: new Date() } as never);

    expect(await getActivePlayerId("user-1")).toBe("player-abc");
  });

  it("getViewer returns demo when session has no user", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    expect(await getViewer()).toEqual({ kind: "demo" });
  });
});
