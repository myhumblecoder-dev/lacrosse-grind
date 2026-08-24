import { countQualifyingHits } from "@/lib/qualifyingWeek";
import { effectiveTarget } from "@/lib/effectiveTarget";
import { LANES_REQUIRED } from "@/lib/season";

interface CheckIn {
  date: Date;
  isRest: boolean;
}

interface Lane {
  targetPerWeek: number;
  checkIns: CheckIn[];
  /** Effective-dated target changes; absent means the lane never changed. */
  targetChanges?: { target: number; effectiveFrom: Date }[];
}

/**
 * Determines if a specific week qualifies based on whether a minimum number of lanes
 * have met their target number of qualifying check-ins.
 */
export function isQualifyingWeek(lanes: Lane[], weekStart: Date): boolean {
  let qualifyingLanesCount = 0;

  for (const lane of lanes) {
    const hits = countQualifyingHits(lane.checkIns, weekStart);
    // The target as it stood in THIS week, not as it stands today — a later
    // edit must not re-score a week already finished.
    const target = effectiveTarget(lane.targetChanges, weekStart, lane.targetPerWeek);
    if (hits >= target) {
      qualifyingLanesCount++;
    }
  }

  return qualifyingLanesCount >= LANES_REQUIRED;
}