import { describeSeason } from "@/lib/seasonTimeline"
import { formatWeekLabel } from "@/lib/weekUtils"
import { SEASON_WEEKS, WEEKS_REQUIRED, LANES_REQUIRED } from "@/lib/season"

/**
 * What is about to happen, said plainly.
 *
 * A season always begins on a Monday, so pressing START on a Friday commits
 * Eddie to a season that begins three days later. Before this existed the
 * button simply turned red and every other pixel stayed the same — the honest
 * reading was that it hadn't worked, and the next move was to press RESET.
 */
export default function SeasonTimelineNote({
  seasonStart,
  today,
}: {
  seasonStart: Date | null
  today: Date
}) {
  const season = describeSeason(seasonStart, today)
  const starts = formatWeekLabel(season.startsOn)
  const ends = formatWeekLabel(season.lastDay)

  const body = (() => {
    switch (season.phase) {
      case "not-started":
        return (
          <>
            Your season starts {starts} and runs {SEASON_WEEKS} weeks, to {ends}.
            Seasons always begin on a Monday so week one is a full week.
          </>
        )
      case "scheduled":
        return (
          <>
            Locked in — your season starts {starts}. Check-ins before then build
            your streak, but the {SEASON_WEEKS} weeks are counted from {starts}.
          </>
        )
      case "running":
        return (
          <>
            Week {season.weekNumber} of {SEASON_WEEKS}. A week counts when at
            least {LANES_REQUIRED} lanes hit their target, and {WEEKS_REQUIRED}{" "}
            counting weeks wins the prize. Season ends {ends}.
          </>
        )
      case "ended":
        return <>Your season is over — it ran {starts} to {ends}.</>
    }
  })()

  return (
    <p
      data-testid="season-timeline"
      className="rounded-lg bg-zinc-900 px-4 py-3 text-sm text-zinc-400"
    >
      {body}
    </p>
  )
}
