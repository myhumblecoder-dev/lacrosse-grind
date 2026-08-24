import { describe, expect, it, vi, beforeEach } from "vitest";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getViewer } from "@/lib/viewer";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { user: { count: vi.fn() } } }));

describe("getViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: the account named by the cookie still exists.
    vi.mocked(prisma.user.count).mockResolvedValue(1);
  });

  it("reports the signed-in user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);

    expect(await getViewer()).toEqual({ kind: "user", userId: "u1" });
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
});
