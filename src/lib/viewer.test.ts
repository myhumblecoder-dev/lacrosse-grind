import { describe, expect, it, vi, beforeEach } from "vitest";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

describe("getViewer", () => {
  beforeEach(() => vi.clearAllMocks());

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
