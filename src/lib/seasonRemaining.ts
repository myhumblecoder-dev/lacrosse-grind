import { getSeasonWeeks } from "@/lib/season";

/**
 * Returns how many season weeks start STRICTLY AFTER the provided date.
 * The week that 'today' falls inside is already underway and is NOT counted.
 */
export function weeksRemaining(today: Date): number {
  const weeks = getSeasonWeeks();
  const todayTime = today.getTime();

  // Filter for weeks where the start date is strictly greater than today's timestamp.
  const futureWeeks = weeks.filter((weekStart) => weekStart.getTime() > todayTime);

  return futureWeeks.length;
}