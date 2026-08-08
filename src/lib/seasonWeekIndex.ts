import { getSeasonWeeks, getSeasonEnd } from "@/lib/season";

/**
 * Returns the 1-based position of the season week containing `today`.
 * Returns null if the date is before the season starts or on/after the season ends.
 */
export function getSeasonWeekIndex(today: Date): number | null {
  const seasonStart = getSeasonWeeks()[0].getTime();
  const seasonEnd = getSeasonEnd().getTime();
  const todayTime = today.getTime();

  // Check if outside the season bounds
  if (todayTime < seasonStart || todayTime >= seasonEnd) {
    return null;
  }

  const weeks = getSeasonWeeks();

  for (let i = 0; i < weeks.length; i++) {
    const weekStart = weeks[i].getTime();
    const nextWeekStart = i + 1 < weeks.length ? weeks[i + 1].getTime() : Infinity;

    // Check if today falls within this week's range
    if (todayTime >= weekStart && todayTime < nextWeekStart) {
      return i + 1;
    }
  }

  return null;
}