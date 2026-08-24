const DAY_MS = 86400000;

/**
 * Returns the number of consecutive days up to and including `today` that were
 * covered — either by showing up, or by a freeze spent on that day.
 *
 * Returns `0` when there is no check-in for `today` at all. A streak is a run
 * of days you turned up for, and a freeze is never spent on today: it repairs
 * days already gone, so putting one on a day still in progress would burn a
 * token on a day that might yet be trained.
 *
 * Rest-day entries count as hits, matching the dashboard's weekly counter.
 * Multiple check-ins on the same day count once. `today` and every date are
 * compared at UTC midnight, so callers should pass the value from
 * `getTrainingDay`.
 */
export function computeStreak(
  checkIns: { date: Date; isRest: boolean }[],
  today: Date,
  frozenDates: Date[] = []
) {
  const dayKey = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const todayKey = dayKey(today);

  if (!checkIns.some((c) => dayKey(c.date) === todayKey)) return 0;

  const covered = new Set<number>();
  for (const date of [...checkIns.map((c) => c.date), ...frozenDates]) {
    const key = dayKey(date);
    if (key <= todayKey) covered.add(key);
  }

  let streak = 0;
  for (let day = todayKey; covered.has(day); day -= DAY_MS) {
    streak++;
  }

  return streak;
}
