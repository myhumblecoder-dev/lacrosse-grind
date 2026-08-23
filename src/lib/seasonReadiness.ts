import { LANES_REQUIRED } from "@/lib/season";

export function getSeasonReadiness(
  laneCount: number,
  hasPrize: boolean,
  lanesNeeded: number = LANES_REQUIRED
): {
  laneCount: number;
  lanesNeeded: number;
  hasPrize: boolean;
  isReady: boolean;
} {
  const isReady = laneCount >= lanesNeeded && hasPrize;

  return {
    laneCount,
    lanesNeeded,
    hasPrize,
    isReady,
  };
}