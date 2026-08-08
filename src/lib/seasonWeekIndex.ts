import { getSeasonWeeks, getSeasonEnd } from "@/lib/season";

/**
 * Returns the 1-based position of the season week containing `today`.
 * Returns null if the date is before the season starts or on/after the season ends.
 */
export function getSeasonWeekIndex(today: Date): number | null {
  const seasonStart = getSeasonWeeks()[0].getTime();
  const seasonEnd = getSeasonEnd().getTime();
  const targetTime = today.getTime();

  // Check if outside the season bounds
  if (targetTime < seasonStart || targetTime >= seasonEnd) {
    return null;
  }

  const weeks = getSeasonWeeks();

  for (let i = 0; i < weeks.length; i++) {
    const weekStart = weeks[i].getTime();
    const nextWeekStart = i + 1 < weeks.length ? weeks[i + 1].getTime() : seasonEnd;

    // Check if today falls within this week's range
    // [weekStart, nextWeekStart)
    if (targetTime >= weekStart && targetTime < nextWeekStart) {
      return i + 1;
    }
  }

  return null;
}