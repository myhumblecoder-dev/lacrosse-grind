import { getWeekStart } from "@/lib/weekUtils";

interface AmendFloors {
  /** The Monday the lane began counting; null/undefined = always running. */
  laneStartsOn?: Date | null;
  /** The Monday the season began; null/undefined = no season floor. */
  seasonStart?: Date | null;
}

/**
 * May a witness amend this day — in either direction?
 *
 * The window is the current running week, Monday through today. Not the whole
 * season, for two reasons that both already have precedent in this codebase:
 *
 * `checkInWindow.ts` names the first one — "a season can be fabricated
 * wholesale by back-dating." Monday-to-today caps that at one week.
 *
 * The second is the rule `LaneTarget` was built to hold: a change made today
 * must not un-qualify a week already earned. Because the season grid re-scores
 * every finished week on each render, a withdrawal reaching into a closed week
 * could revoke a qualified week — punishing the honesty that produced it. A
 * closed week stays closed, so that cannot happen.
 *
 * Three floors rather than one. The lane's `startsOn` keeps a lane that has not
 * begun this week out of a week it is not scored for (see `lanePending.ts`), and
 * `seasonStart` keeps a day from landing before the season existed.
 *
 * Every comparison is at UTC midnight, so callers should pass the value from
 * `getTrainingDay`.
 */
export function isWithinAmendWindow(
  date: Date,
  today: Date,
  floors: AmendFloors = {}
): boolean {
  const dayKey = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  const asked = dayKey(date);
  const now = dayKey(today);

  // Never the future: a day that has not happened cannot have been trained.
  if (asked > now) return false;

  // Never before this week's Monday.
  if (asked < dayKey(getWeekStart(today))) return false;

  // A null or undefined floor is ignored, the way `isLanePending` treats a
  // missing `startsOn`: no stamp means nothing to be before.
  const { laneStartsOn, seasonStart } = floors;
  if (laneStartsOn && asked < dayKey(laneStartsOn)) return false;
  if (seasonStart && asked < dayKey(seasonStart)) return false;

  return true;
}
