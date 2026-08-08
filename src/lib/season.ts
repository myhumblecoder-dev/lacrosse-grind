export const SEASON_START = new Date("2026-08-10T00:00:00.000Z");
export const SEASON_WEEKS = 13;
export const WEEKS_REQUIRED = 11;
export const LANES_REQUIRED = 3;
export const REST_CAP_PER_WEEK = 1;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Returns exactly SEASON_WEEKS dates, starting with SEASON_START,
 * with each subsequent date being exactly 7 days after the previous one.
 */
export function getSeasonWeeks(): Date[] {
  const weeks: Date[] = [];
  for (let i = 0; i < SEASON_WEEKS; i++) {
    const weekDate = new Date(SEASON_START.getTime() + i * MS_PER_WEEK);
    weeks.push(weekDate);
  }
  return weeks;
}

/**
 * Returns the exclusive end of the season:
 * SEASON_START plus (SEASON_WEEKS * 7) days.
 */
export function getSeasonEnd(): Date {
  return new Date(SEASON_START.getTime() + SEASON_WEEKS * MS_PER_WEEK);
}