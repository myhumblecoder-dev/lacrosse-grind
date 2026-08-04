import { formatInTimeZone } from "date-fns-tz";

export const TRAINING_TZ = "America/New_York";
export const DAY_ROLLOVER_HOUR = 3;

/**
 * Returns a Date object representing the start of the current training day.
 * The training day is defined as the period from DAY_ROLLOVER_HOUR local time
 * to DAY_ROLLOVER_HOUR local time the next morning.
 * 
 * The returned Date is pinned to UTC midnight (00:00:00.000Z) of the
 * calendar date that corresponds to the training day label.
 */
export function getTrainingDay(now: Date = new Date()): Date {
  // 1. Shift the instant back by the rollover hour.
  // If it is 1:00 AM, shifting back 3 hours moves us into the previous calendar day.
  const shiftedDate = new Date(now.getTime() - DAY_ROLLOVER_HOUR * 60 * 60 * 1000);

  // 2. Format the shifted instant in the training timezone to get the yyyy-MM-dd label.
  const dateLabel = formatInTimeZone(shiftedDate, TRAINING_TZ, "yyyy-MM-dd");

  // 3. Construct the ISO string for UTC midnight of that date.
  // We use string concatenation instead of template literals to avoid potential build issues.
  const isoString = dateLabel + "T00:00:00.000Z";

  return new Date(isoString);
}