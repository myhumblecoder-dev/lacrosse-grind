import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { generate } from "@/lib/llm";
import { askCoach } from "@/lib/coach";

vi.mock("@/lib/db", () => ({
  prisma: { coachCall: { count: vi.fn(), create: vi.fn() } },
}));
vi.mock("@/lib/llm", () => ({ generate: vi.fn() }));

describe("askCoach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.COACH_DAILY_LIMIT;
    delete process.env.COACH_GLOBAL_DAILY_LIMIT;
    vi.mocked(prisma.coachCall.count).mockResolvedValue(0);
    vi.mocked(prisma.coachCall.create).mockResolvedValue({} as never);
    vi.mocked(generate).mockResolvedValue("a challenge");
  });

  afterEach(() => {
    delete process.env.COACH_DAILY_LIMIT;
    delete process.env.COACH_GLOBAL_DAILY_LIMIT;
  });

  it("answers when there is budget", async () => {
    expect(await askCoach("u1", "challenge", "prompt")).toEqual({
      ok: true,
      text: "a challenge",
    });
    expect(generate).toHaveBeenCalledWith("prompt");
  });

  it("records the call so spend is counted, not inferred", async () => {
    // A re-roll generates without creating a BossBattle, which is how the old
    // battle-count proxy missed it entirely.
    await askCoach("u1", "reroll", "prompt");

    expect(prisma.coachCall.create).toHaveBeenCalledWith({
      data: { userId: "u1", kind: "reroll" },
    });
  });

  it("records before asking, so a failed generation still counts", async () => {
    // Otherwise a caller hammering it into failure would never be charged —
    // exactly when a runaway is most likely to be hammering.
    vi.mocked(generate).mockRejectedValue(new Error("upstream is down"));

    const answer = await askCoach("u1", "challenge", "prompt");

    expect(answer).toEqual({ ok: false, error: "coach-failed" });
    expect(prisma.coachCall.create).toHaveBeenCalled();
  });

  it("refuses once the caller has had their day's worth", async () => {
    process.env.COACH_DAILY_LIMIT = "3";
    vi.mocked(prisma.coachCall.count).mockResolvedValue(3);

    expect(await askCoach("u1", "challenge", "p")).toEqual({
      ok: false,
      error: "coach-limit",
    });
    expect(generate).not.toHaveBeenCalled();
    expect(prisma.coachCall.create).not.toHaveBeenCalled();
  });

  it("refuses when everyone together has spent the day's budget", async () => {
    process.env.COACH_DAILY_LIMIT = "100";
    process.env.COACH_GLOBAL_DAILY_LIMIT = "5";
    // This user has barely used it; the service as a whole has not.
    vi.mocked(prisma.coachCall.count)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(5);

    expect(await askCoach("u1", "challenge", "p")).toEqual({
      ok: false,
      error: "coach-limit",
    });
    expect(generate).not.toHaveBeenCalled();
  });

  it("counts this user separately from everyone else", async () => {
    await askCoach("u1", "challenge", "p");

    const calls = vi.mocked(prisma.coachCall.count).mock.calls;
    expect(calls[0][0]).toMatchObject({ where: { userId: "u1" } });
    // The global count must NOT be scoped to the user, or it is just the
    // per-user cap again wearing a different name.
    expect(calls[1][0]?.where).not.toHaveProperty("userId");
  });

  it("ignores a nonsense limit rather than obeying it", async () => {
    // "0" or "abc" must not silently mean "never" or "unlimited".
    process.env.COACH_DAILY_LIMIT = "not-a-number";
    vi.mocked(prisma.coachCall.count).mockResolvedValue(0);

    expect(await askCoach("u1", "challenge", "p")).toMatchObject({ ok: true });
  });
});
