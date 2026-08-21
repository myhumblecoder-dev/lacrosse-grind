import { prisma } from "@/lib/db"
import { buildWeekRecaps } from "@/lib/weekRecap"
import { formatWeekLabel } from "@/lib/weekUtils"

export const dynamic = "force-dynamic"

export default async function HistoryPage() {
  const prize = await prisma.prize.findUnique({ where: { id: "prize" } })
  const lanes = await prisma.lane.findMany({
    orderBy: [
      { isActive: "desc" },
      { sortOrder: "asc" },
    ],
    include: {
      bossBattles: true,
      checkIns: {
        ...(prize?.seasonStart ? { where: { date: { gte: prize.seasonStart } } } : {}),
        orderBy: { date: "asc" },
      },
    },
  })

  const recaps = buildWeekRecaps(lanes)

  return (
    <main className="max-w-3xl mx-auto space-y-8 p-6">
      <h1 className="text-2xl font-bold">History</h1>
      <p className="mt-1 text-sm text-zinc-500">Your season, week by week — green for a session, blue for a rest day, purple for a boss-battle week. Only days you showed up are here.</p>
      {recaps.map((recap) => (
        <section key={recap.weekStart.getTime()} className="space-y-3">
          <h2 className="text-lg font-semibold">Week of {formatWeekLabel(recap.weekStart)}</h2>
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
                {lane.days.map((d) => (
                  <div
                    key={d.date.getTime()}
                    className={`h-6 w-6 rounded ${
                      d.isRest
                        ? "bg-blue-300"
                        : lane.battleFought
                          ? "bg-purple-500"
                          : "bg-green-400"
                    }`}
                    title={d.date.toISOString().slice(0, 10)}
                  />
                ))}
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
