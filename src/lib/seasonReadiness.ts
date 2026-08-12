import { LANES_REQUIRED } from "@/lib/season";

export function getSeasonReadiness(laneCount: number, hasPrize: boolean): {
  laneCount: number;
  lanesNeeded: number;
  hasPrize: boolean;
  isReady: boolean;
} {
  const lanesNeeded = LANES_REQUIRED;
  const isReady = laneCount >= lanesNeeded && hasPrize;

  return {
    laneCount,
    lanesNeeded,
    hasPrize,
    isReady,
  };
}