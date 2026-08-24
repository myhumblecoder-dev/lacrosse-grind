import { getWeekStatuses, type WeekStatus } from "@/lib/weekStatuses";
import { SEASON_WEEKS, WEEKS_REQUIRED } from "@/lib/season";

export interface SeasonProgress {
  weeks: Array<{
    weekStart: Date;
    status: WeekStatus;
  }>;
  qualified: number;
  missed: number;
  missedAllowed: number;
  missesRemaining: number;
  earned: boolean;
}

export function getSeasonProgress(
  lanes: Array<{
    targetPerWeek: number;
    checkIns: Array<{
      date: Date;
      isRest: boolean;
    }>;
    targetChanges?: Array<{ target: number; effectiveFrom: Date }>;
  }>,
  today: Date,
  seasonStart: Date | null
): SeasonProgress {
  const weeks = getWeekStatuses(lanes, today, seasonStart);

  const qualified = weeks.filter((w) => w.status === "qualified").length;
  const missed = weeks.filter((w) => w.status === "missed").length;

  const missedAllowed = SEASON_WEEKS - WEEKS_REQUIRED;
  const missesRemaining = Math.max(0, missedAllowed - missed);
  const earned = qualified >= WEEKS_REQUIRED;

  return {
    weeks,
    qualified,
    missed,
    missedAllowed,
    missesRemaining,
    earned,
  };
}