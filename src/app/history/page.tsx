import { prisma } from "@/lib/db"
import { getViewer, type Viewer } from "@/lib/viewer"
import { getDemoSeason } from "@/lib/demoSeason"
import DemoBanner from "@/components/DemoBanner"
import { buildWeekRecaps } from "@/lib/weekRecap"
import { formatWeekLabel, getWeekStart } from "@/lib/weekUtils"
import { getTrainingDay } from "@/lib/trainingDay"
import Link from "next/link"

export const dynamic = "force-dynamic"

/** Every lane the season has seen, from the database or from the demo. */
async function loadHistory(viewer: Viewer, today: Date) {
  if (viewer.kind === "demo") {
    const demo = getDemoSeason(today)
    return [...demo.lanes].sort(
      (a, b) => Number(b.isActive) - Number(a.isActive) || a.sortOrder - b.sortOrder
    )
  }

  const { playerId } = viewer
  const prize = await prisma.prize.findUnique({ where: { playerId } })
  return prisma.lane.findMany({
    where: { playerId },
    orderBy: [
      { isActive: "desc" },
      { sortOrder: "asc" },
    ],
    include: {
      bossBattles: true,
      targetChanges: true,
      checkIns: {
        ...(prize?.seasonStart ? { where: { date: { gte: prize.seasonStart } } } : {}),
        orderBy: { date: "asc" },
      },
    },
  })
}

export default async function HistoryPage() {
  const viewer = await getViewer()
  const today = getTrainingDay(new Date())
  const lanes = await loadHistory(viewer, today)

  const recaps = buildWeekRecaps(lanes)
  const thisWeekStart = getWeekStart(today)

  // The door to /amend sits with the week it opens onto, not at the top of the
  // page: this is where a parent notices a week is wrong. It renders BESIDE the
  // heading rather than inside it — a link within an h2 becomes part of the
  // heading's accessible name. A demo visitor never sees it: nothing to amend,
  // and no action they could reach.
  const amendLink =
    viewer.kind === "user" ? (
      <Link
        href="/amend"
        data-testid="amend-link"
        className="rounded-lg border border-zinc-700 px-3 py-1 text-sm font-normal text-zinc-300 transition-colors hover:bg-zinc-800"
      >
        Amend
      </Link>
    ) : null

  // buildWeekRecaps builds its weeks FROM the check-ins, so a week with nothing
  // in it gets no section at all — and that is exactly the week most likely to
  // need amending. Without this, the one week with no door would be the one
  // that needs it.
  const hasThisWeek = recaps.some(
    (r) => r.weekStart.getTime() === thisWeekStart.getTime()
  )

  return (
    <main className="max-w-3xl mx-auto space-y-8 p-6">
      {viewer.kind === "demo" && <DemoBanner />}
      <h1 className="text-2xl font-bold">History</h1>
      <p className="mt-1 text-sm text-zinc-500">Your season, week by week — green for a session, blue for a rest day, purple for the day you beat a boss. Only days you showed up are here.</p>
      {!hasThisWeek && amendLink && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">
              This week — {formatWeekLabel(thisWeekStart)}
            </h2>
            {amendLink}
          </div>
          <p className="text-sm text-zinc-500">
            Nothing on the record yet this week.
          </p>
        </section>
      )}
      {recaps.map((recap) => (
        <section key={recap.weekStart.getTime()} className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">
              {recap.weekStart.getTime() === thisWeekStart.getTime()
                ? <>This week — {formatWeekLabel(recap.weekStart)}</>
                : <>Week of {formatWeekLabel(recap.weekStart)}</>}
            </h2>
            {recap.weekStart.getTime() === thisWeekStart.getTime() && amendLink}
          </div>
          {recap.lanes.map((lane) => (
            <div
              key={lane.id}
              className={`flex items-center gap-3 ${!lane.isActive ? "opacity-60" : ""}`}
            >
              <span className="w-48 truncate">
                {lane.emoji} {lane.name}
                {!lane.isActive && (
                  <span data-testid="retired-tag" className="ml-2 text-xs text-zinc-500">
                    retired
                  </span>
                )}
              </span>
              <div className="flex gap-1">
                {lane.days.map((d) => {
                  // Purple marks the day the boss fell, not the week it fell
                  // in. Keying this off the week-level flag repainted every
                  // session purple and lost the record of showing up.
                  const beatTheBoss =
                    lane.battleDay !== null &&
                    d.date.getTime() === lane.battleDay.getTime()

                  return (
                    <div
                      key={d.date.getTime()}
                      // Rest still wins: a rest day reads blue even if the boss
                      // happened to fall on it, which is the rule this page
                      // already held to.
                      className={`h-6 w-6 rounded ${
                        d.isRest
                          ? "bg-blue-300"
                          : beatTheBoss
                            ? "bg-purple-500"
                            : "bg-green-400"
                      }`}
                      title={
                        d.date.toISOString().slice(0, 10) +
                        (d.isRest ? " — rest day" : beatTheBoss ? " — boss defeated" : "")
                      }
                    />
                  )
                })}
              </div>
              <span className="text-sm text-zinc-600">
                {lane.hits} / {lane.target} days
              </span>
              {lane.battleFought && <span className="text-sm">⚔️ boss fought</span>}
            </div>
          ))}
        </section>
      ))}
    </main>
  )
}
