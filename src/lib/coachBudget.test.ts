import { describe, expect, it } from "vitest";
import {
  coachBudget,
  DEFAULT_COACH_LIMITS,
  type CoachLimits,
} from "@/lib/coachBudget";

const limits: CoachLimits = { perUser: 30, global: 1000 };

describe("coachBudget", () => {
  it("allows a family well inside both ceilings", () => {
    expect(coachBudget(4, 120, limits)).toEqual({ allowed: true });
  });

  it("allows the very last call before the personal ceiling", () => {
    expect(coachBudget(29, 0, limits)).toEqual({ allowed: true });
  });

  it("refuses once one person has had their day's worth", () => {
    expect(coachBudget(30, 0, limits)).toEqual({
      allowed: false,
      reason: "user-limit",
    });
  });

  it("refuses everyone once the global ceiling is reached", () => {
    // The one that actually bounds the bill: sign-ups are open, so a per-user
    // cap limits one person and says nothing about how many people there are.
    expect(coachBudget(0, 1000, limits)).toEqual({
      allowed: false,
      reason: "global-limit",
    });
  });

  it("blames the personal ceiling when both are gone", () => {
    // It is the one they can do something about. Being told the service is
    // busy when you personally burned thirty is misleading.
    expect(coachBudget(30, 1000, limits)).toEqual({
      allowed: false,
      reason: "user-limit",
    });
  });

  it("never bites a plausible day of real training", () => {
    // A boss costs at most four generations — challenge, two re-rolls, victory
    // note — and the demand ladder caps a player at six lanes. Even a day
    // where every lane hit target and every boss was fought is 24.
    const busiestRealDay = 6 * 4;

    expect(coachBudget(busiestRealDay, 0, DEFAULT_COACH_LIMITS)).toEqual({
      allowed: true,
    });
  });

  it("defaults to something bounded rather than unlimited", () => {
    expect(DEFAULT_COACH_LIMITS.perUser).toBeGreaterThan(0);
    expect(DEFAULT_COACH_LIMITS.global).toBeGreaterThan(0);
    expect(DEFAULT_COACH_LIMITS.global).toBeGreaterThan(DEFAULT_COACH_LIMITS.perUser);
  });
});
