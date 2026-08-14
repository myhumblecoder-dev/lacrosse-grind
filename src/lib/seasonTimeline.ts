import { SEASON_WEEKS } from "@/lib/season"
import { getSeasonWeeksFrom } from "@/lib/seasonWindow"
import { resolveSeasonStart } from "@/lib/seasonAnchor"

const MS_PER_DAY = 24 * 60 * 60 * 1000

export type SeasonPhase = "not-started" | "scheduled" | "running" | "ended"

export interface SeasonTimeline {
  phase: SeasonPhase
  /** UTC midnight Monday the season begins, or would begin. */
  startsOn: Date
  /** Exclusive end: the Monday after the thirteenth week. */
  endsOn: Date
  /** The last day Eddie can train in this season — inclusive, for display. */
  lastDay: Date
  /** 1..SEASON_WEEKS while running, null otherwise. */
  weekNumber: number | null
}

/**
 * What is about to happen, in terms Eddie can act on.
 *
 * A season always begins on a Monday, so pressing START on a Friday commits
 * him to a season that begins three days later. Nothing in the UI said so:
 * the button turned red, the grid stayed identical, and no screen showed a
 * date — so the honest reading was "it didn't work".
 *
 * The Monday anchor is right. A Friday start would make week 1 a three-day
 * week against a five-a-week target, and he would burn one of his two allowed
 * misses on a week he never had a chance at. It just has to be visible.
 */
export function describeSeason(
  seasonStart: Date | null,
  today: Date
): SeasonTimeline {
  const startsOn = seasonStart ?? resolveSeasonStart(today)
  const weeks = getSeasonWeeksFrom(startsOn)
  const endsOn = new Date(weeks[SEASON_WEEKS - 1].getTime() + 7 * MS_PER_DAY)
  const lastDay = new Date(endsOn.getTime() - MS_PER_DAY)

  if (seasonStart === null) {
    return { phase: "not-started", startsOn, endsOn, lastDay, weekNumber: null }
  }
  if (today.getTime() < startsOn.getTime()) {
    return { phase: "scheduled", startsOn, endsOn, lastDay, weekNumber: null }
  }
  if (today.getTime() >= endsOn.getTime()) {
    return { phase: "ended", startsOn, endsOn, lastDay, weekNumber: null }
  }

  const elapsed = today.getTime() - startsOn.getTime()
  const weekNumber = Math.floor(elapsed / (7 * MS_PER_DAY)) + 1
  return { phase: "running", startsOn, endsOn, lastDay, weekNumber }
}
