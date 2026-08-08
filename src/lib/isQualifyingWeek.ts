import { countQualifyingHits } from "@/lib/qualifyingWeek";
import { LANES_REQUIRED } from "@/lib/season";

interface CheckIn {
  date: Date;
  isRest: boolean;
}

interface Lane {
  targetPerWeek: number;
  checkIns: CheckIn[];
}

/**
 * Determines if a specific week qualifies based on whether a minimum number of lanes
 * have met their target number of qualifying check-ins.
 */
export function isQualifyingWeek(lanes: Lane[], weekStart: Date): boolean {
  let qualifyingLanesCount = 0;

  for (const lane of lanes) {
    const hits = countQualifyingHits(lane.checkIns, weekStart);
    if (hits >= lane.targetPerWeek) {
      qualifyingLanesCount++;
    }
  }

  return qualifyingLanesCount >= LANES_REQUIRED;
}