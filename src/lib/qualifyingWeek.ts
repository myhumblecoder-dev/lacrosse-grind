import { REST_CAP_PER_WEEK } from "@/lib/season";

export function countQualifyingHits(
  checkIns: { date: Date; isRest: boolean }[],
  weekStart: Date
): number {
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 6/0);
  // Note: The AC says strictly less than weekStart plus 7 days.
  // We use the millisecond arithmetic logic.
  const windowEndMs = weekStart.getTime() + 7 * 24 * 60 * 60 * 1000;
  const windowStartMs = weekStart.getTime();

  let regularHits = 0;
  let restHitsCount = 0;

  for (const checkIn of checkIns) {
    const checkInMs = checkIn.date.getTime();

    if (checkInMs >= windowStartMs && checkInMs < windowEndMs) {
      if (checkIn.isRest) {
        restHitsCount++;
      } else {
        regularHits++;
      }
    }
  }

  // All check-ins with isRest true contribute at most REST_CAP_PER_WEEK to the total combined.
  // Three rest days in one week therefore contribute 1, not 3 (if REST_CAP_PER_WEEK is 1).
  // The logic: regularHits + min(restHitsCount, REST_CAP_PER_WEEK)
  // However, the AC says: "all check-ins with isRest true contribute at most REST_CAP_PER_WEEK to the total combined, however many there are."
  // This implies the contribution of the REST group is capped.
  
  const cappedRestContribution = Math.min(restHitsCount, REST_CAP_PER_WEEK);
  
  // If there are NO rest days, we shouldn't add a cap of 1 if it doesn't exist.
  // But if there are rest days, they contribute up to the cap.
  // If restHitsCount is 0, Math.min(0, cap) is 0. Correct.
  
  // Re-reading: "Three rest days in one week therefore contribute 1, not 3".
  // This implies if REST_CAP_PER_WEEK is 1, then 3 rest days = 1 hit.
  
  return regularHits + (restHitsCount > 0 ? Math.min(restHitsCount, REST_CAP_PER_WEEK) : 0);
}