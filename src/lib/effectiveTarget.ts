/**
 * The weekly target a lane was being scored against in a given week.
 *
 * Targets are effective-dated rather than overwritten, because the season grid
 * re-reads every finished week each time it renders. If a target were a single
 * mutable number, raising a lane from 3×/week to 5×/week would re-score weeks
 * Eddie already earned and could silently un-qualify them — a change to the
 * future rewriting the past.
 *
 * `changes` need not be sorted. A week earlier than every change falls back to
 * the lane's original target.
 */
export function effectiveTarget(
  changes: { target: number; effectiveFrom: Date }[] | undefined,
  weekStart: Date,
  fallback: number
): number {
  let best: { target: number; effectiveFrom: Date } | null = null;

  for (const change of changes ?? []) {
    if (change.effectiveFrom.getTime() > weekStart.getTime()) continue;
    if (best === null || change.effectiveFrom.getTime() > best.effectiveFrom.getTime()) {
      best = change;
    }
  }

  return best === null ? fallback : best.target;
}
