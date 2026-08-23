/**
 * Calculates the number of lanes required based on the player's level.
 * The demand ladder follows: levels 0-2 require 3 lanes, level 3 requires 4,
 * level 4 requires 5, and level 5 and above require 6 (capped).
 */
export function requiredLanes(level: number): number {
  // Input sanitize FIRST: clamp to 0 and floor to handle decimals/negatives
  const n = Math.max(0, Math.floor(level || 0));

  // The monster's demand ladder: 3 + max(0, n - 2), capped at 6
  // 0-2 -> 3
  // 3 -> 4
  // 4 -> 5
  // 5+ -> 6
  return Math.min(3 + Math.max(0, n - 2), 6);
}