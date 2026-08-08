import { SEASON_START, getSeasonEnd } from "@/lib/season"
import { formatWeekLabel } from "@/lib/weekUtils"

/**
 * Returns a display string representing the current season's range,
 * e.g., "Mon 10 Aug 2026 – Mon 09 Nov 2026".
 */
export function formatSeasonRange(): string {
  const startLabel = formatWeekLabel(SEASON_START)
  const endLabel = formatWeekLabel(getSeasonEnd())
  return `${startLabel} – ${endLabel}`
}