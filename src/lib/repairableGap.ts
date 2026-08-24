import { computeStreak } from "@/lib/streak";

const DAY_MS = 86400000;

/**
 * The missed day a freeze should be offered for, or null if none is worth it.
 *
 * A token is only offered when spending it *reconnects* today's run to an
 * earlier one. Covering a day with nothing behind it would add a single day to
 * the streak in exchange for a token Eddie had to beat a boss to earn — a bad
 * trade dressed up as a rescue, and the kind of thing that teaches a kid the
 * currency is worthless.
 *
 * That test is why this asks `computeStreak` rather than inspecting days
 * itself: freezing the gap is worth it exactly when it buys more than the one
 * day being frozen.
 *
 * Returns null while today has no check-in — the offer belongs after showing
 * up, so repairing the past is a reward for turning up rather than a
 * substitute for it.
 */
export function findRepairableGap(
  checkIns: { date: Date; isRest: boolean }[],
  today: Date,
  frozenDates: Date[] = []
): Date | null {
  const current = computeStreak(checkIns, today, frozenDates);
  if (current === 0) return null;

  const todayKey = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  const gap = new Date(todayKey - current * DAY_MS);

  const repaired = computeStreak(checkIns, today, [...frozenDates, gap]);
  return repaired > current + 1 ? gap : null;
}
