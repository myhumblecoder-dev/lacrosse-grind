import { differenceInCalendarDays } from "date-fns";

/**
 * Returns the number of consecutive days up to and including `today` that have a check-in.
 * Returns `0` when there is no check-in for `today` at all.
 * Rest-day entries count as hits, matching the dashboard's weekly counter.
 * Multiple check-ins on the same day count once.
 * `today` and every check-in date are compared at UTC midnight, so callers should pass the value from `getTrainingDay`.
 */
export function computeStreak(checkIns: { date: Date; isRest: boolean }[], today: Date) {
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  // Filter for check-ins that are on or before today
  // and normalize them to start of day for comparison without mutating input
  const validCheckIns = checkIns
    .map((ci) => ({
      ...ci,
      date: new Date(Date.UTC(ci.date.getUTCFullYear(), ci.date.getUTCMonth(), ci.date.getUTCDate())),
    }))
    .filter((ci) => ci.date <= todayStart);

  // Check if there is a check-in for today
  const hasToday = validCheckIns.some(
    (ci) => differenceInCalendarDays(todayStart, ci.date) === 0
  );

  if (!hasToday) {
    return 0;
  }

  // Sort check-ins descending by date
  const sortedDates = validCheckIns
    .map((ci) => ci.date.getTime())
    .sort((a, b) => b - a);

  // Remove duplicates (multiple check-ins on same day)
  const uniqueDates = Array.from(new Set(sortedDates));

  let streak = 0;
  let currentDay = todayStart.getTime();

  for (const dateTimestamp of uniqueDates) {
    if (dateTimestamp === currentDay) {
      streak++;
      // Move to the previous calendar day (86400000 ms = 1 day)
      currentDay -= 86400000;
    } else {
      // Gap found
      break;
    }
  }

  return streak;
}
