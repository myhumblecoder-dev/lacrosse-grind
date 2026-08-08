import { getSeasonWeeks } from "@/lib/season";
import { isQualifyingWeek } from "@/lib/isQualifyingWeek";

export type WeekStatus = "qualified" | "missed" | "current" | "upcoming";

interface LaneData {
  targetPerWeek: number;
  checkIns: { date: Date; isRest: boolean }[];
}

export function getWeekStatuses(
  lanes: LaneData[],
  today: Date
): { weekStart: Date; status: WeekStatus }[] {
  const seasonWeeks = getSeasonWeeks();

  return seasonWeeks.map((weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // A week whose window contains today gets status "current"
    if (weekStart <= today && today < weekEnd) {
      return { weekStart, status: "current" };
    }

    // A week whose weekStart is strictly after today gets status "upcoming"
    if (weekStart > today) {
      return { weekStart, status: "upcoming" };
    }

    // A week whose window has fully elapsed (weekEnd <= today)
    // gets "qualified" if isQualifyingWeek returns true, and "missed" otherwise.
    const qualifies = isQualifyingWeek(lanes, weekStart);
    return { weekStart, status: qualifies ? "qualified" : "missed" };
  });
}