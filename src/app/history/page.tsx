import { prisma } from "@/lib/db"
import { computeStreak } from "@/lib/streak"
import { getTrainingDay } from "@/lib/trainingDay"

export const dynamic = "force-dynamic"

const DAY_MS = 24 * 60 * 60 * 1000

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export default async function HistoryPage() {
  const today = getTrainingDay(new Date())
  const start = new Date(today.getTime() - 29 * DAY_MS)

  const lanesRaw = await prisma.lane.findMany({
    orderBy: [
      { isActive: "desc" },
      { sortOrder: "asc" },
    ],
    include: {
      checkIns: {
        where: { date: { gte: start } },
        orderBy: { date: "asc" },
      },
    },
  })

  const lanes = lanesRaw.filter((lane) => !( !lane.isActive && lane.checkIns.length === 0 ))

  const days = Array.from({ length: 30 }, (_, i) => new Date(start.getTime() + i * DAY_MS))

  return (
    <main className="max-w-3xl mx-auto space-y-8 p-6">
      <h1 className="text-2xl font-bold">History</h1>
      <p className="mt-1 text-sm text-zinc-500">Your last 30 days at a glance — green for a session, blue for a rest day. Watch the consistency stack up.</p>
      {lanes.map((lane) => {
        const streak = computeStreak(
          lane.checkIns.map((c) => ({ date: c.date, isRest: c.isRest })),
          today
        )
        const byDay = new Map(
          lane.checkIns.map((c) => [utcMidnight(c.date).getTime(), c])
        )
        return (
          <section
            key={lane.id}
            className={`space-y-2 ${!lane.isActive ? "opacity-60" : ""}`}
          >
            <h2 className="text-lg font-semibold">
              {lane.emoji} {lane.name} — {streak}🔥
              {!lane.isActive && (
                <span data-testid="retired-tag" className="ml-2 text-xs text-zinc-500">
                  retired
                </span>
              )}
            </h2>
            <div className="grid grid-cols-10 gap-1">
              {days.map((d) => {
                const c = byDay.get(d.getTime())
                const cls = c
                  ? c.isRest
                    ? "bg-blue-300"
                    : "bg-green-400"
                  : "bg-zinc-800"
                return (
                  <div
                    key={d.getTime()}
                    className={`h-6 w-6 rounded ${cls}`}
                    title={d.toISOString().slice(0, 10)}
                  />
                )
              })}
            </div>
          </section>
        )
      })}
    </main>
  )
}
