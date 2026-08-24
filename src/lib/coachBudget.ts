export type CoachBudget =
  | { allowed: true }
  | { allowed: false; reason: "user-limit" | "global-limit" };

/** A day's worth of generations for one person, and for everyone. */
export interface CoachLimits {
  perUser: number;
  global: number;
}

/**
 * Useful but not careless.
 *
 * A real family should never meet these numbers. A boss costs at most four
 * generations — the challenge, up to two re-rolls, and the victory note — and
 * the demand ladder caps a player at six lanes, so even a day where every lane
 * hit its target and every boss was fought comes to about twenty-four.
 *
 * The global ceiling is the one that actually bounds the bill. Sign-ups are
 * open, so a per-user cap limits one person and says nothing about how many
 * people there are.
 */
export const DEFAULT_COACH_LIMITS: CoachLimits = { perUser: 30, global: 1000 };

/**
 * May the coach be asked again today?
 *
 * Takes counts rather than reading them, so the rule can be tested without a
 * database and cannot disagree with itself depending on who calls it.
 *
 * The user's own limit is reported first when both are exhausted: it is the
 * one they can do something about, and being told the whole service is busy
 * when you personally burned thirty is misleading.
 */
export function coachBudget(
  todayForUser: number,
  todayGlobal: number,
  limits: CoachLimits = DEFAULT_COACH_LIMITS
): CoachBudget {
  if (todayForUser >= limits.perUser) {
    return { allowed: false, reason: "user-limit" };
  }
  if (todayGlobal >= limits.global) {
    return { allowed: false, reason: "global-limit" };
  }
  return { allowed: true };
}
