/**
 * Has this lane not started counting yet?
 *
 * A lane added or swapped in mid-week is stamped with the Monday it begins, so
 * it is never measured against days it did not exist for. Adding a lane on a
 * Sunday against a 5-a-week target would otherwise read "0 / 5 days this week"
 * — a score it cannot reach — which is exactly the deficit framing this app
 * refuses to use.
 *
 * A lane with no stamp — null from a row that predates the column, undefined
 * from a caller that never selected it — has always been running.
 */
export function isLanePending(
  startsOn: Date | null | undefined,
  weekStart: Date
): boolean {
  if (!startsOn) return false;
  return startsOn.getTime() > weekStart.getTime();
}
