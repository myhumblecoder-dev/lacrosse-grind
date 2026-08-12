import { getSeasonWeeksFrom } from '@/lib/seasonWindow';
import { isQualifyingWeek } from '@/lib/isQualifyingWeek';
import { SEASON_START, SEASON_WEEKS } from '@/lib/season';

export type WeekStatus = "qualified" | "missed" | "current" | "upcoming";

interface LaneData {
  targetPerWeek: number;
  checkIns: { date: Date; isRest: boolean }[];
}

export function getWeekStatuses(
  lanes: LaneData[],
  today: Date,
  seasonStart: Date | null = SEASON_START
): { weekStart: Date; status: WeekStatus }[] {
  if (seasonStart === null) {
    const weeks = getSeasonWeeksFrom(today);
    return weeks.map((weekStart) => ({
      weekStart,
      status: "upcoming" as const,
    }));
  }

  const seasonWeeks = getSeasonWeeksFrom(seasonStart);

  return seasonWeeks.map((weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // A week whose window contains today gets status "current"
    if (weekStart <= today && today < weekEnd) {
      return { weekStart, status: "current" as const };
    }

    // A week whose weekStart is strictly after today gets status "upcoming"
    if (weekStart > today) {
      return { weekStart, status: "upcoming" as const };
    }

    // A week whose window has fully elapsed (weekEnd <= today)
    // gets "qualified" if isQualifyingWeek returns true, and "missed" otherwise.
    const qualifies = isQualifyingWeek(lanes, weekStart);
    return { weekStart, status: qualifies ? "qualified" as const : "missed" as const };
  });
}