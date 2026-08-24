const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How far back a check-in may be dated. Today, or the day before it.
 *
 * Yesterday is allowed for one honest reason: the training day rolls over at
 * 3am, so a page opened on Tuesday evening and submitted after the rollover
 * would otherwise be refused for a session that really happened. It also
 * forgives someone who forgot to tap last night, which is the kind of slack
 * this app builds in everywhere else.
 */
export const CHECK_IN_GRACE_DAYS = 1;

/**
 * May a check-in be recorded for this day?
 *
 * `checkInSchema` accepts any `Date` at all, and the action is callable
 * directly rather than only through the card that always sends today. Left
 * open, that means two things: a season can be fabricated wholesale by
 * back-dating, and the History page will happily build a week around a
 * check-in dated 2099 — it takes its weeks from the check-ins themselves,
 * with no window of its own.
 *
 * Both dates are compared at UTC midnight, so callers should pass the value
 * from `getTrainingDay`.
 */
export function isWithinCheckInWindow(date: Date, today: Date): boolean {
  const dayKey = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  const asked = dayKey(date);
  const now = dayKey(today);

  // Never the future: a day that has not happened cannot have been trained.
  if (asked > now) return false;

  return now - asked <= CHECK_IN_GRACE_DAYS * DAY_MS;
}
