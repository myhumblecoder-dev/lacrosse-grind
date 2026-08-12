import { SEASON_WEEKS } from "@/lib/season";

/**
 * Returns an array of dates representing the start of each week in the season,
 * starting from the provided seasonStart date.
 * 
 * @param seasonStart - The starting date of the season.
 * @returns An array of Date objects, one for each week in the season.
 */
export function getSeasonWeeksFrom(seasonStart: Date): Date[] {
  const weeks: Date[] = [];
  const startMs = seasonStart.getTime();
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < SEASON_WEEKS; i++) {
    weeks.push(new Date(startMs + i * sevenDaysInMs));
  }

  return weeks;
}