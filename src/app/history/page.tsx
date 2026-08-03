import { prisma } from "@/lib/db"
import { computeStreak } from "@/lib/streak"

export const dynamic = "force-dynamic"

const DAY_MS = 24 * 60 * 60 * 1000

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export default async function HistoryPage() {
  const today = utcMidnight(new Date())
  const start = new Date(today.getTime() - 29 * DAY_MS)

  const lanes = await prisma.lane.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      checkIns: {
        where: { date: { gte: start } },
        orderBy: { date: "asc" },
      },
    },
  })

  const days = Array.from({ length: 30 }, (_, i) => new Date(start.getTime() + i * DAY_MS))

  return (
    <main className="max-w-3xl mx-auto space-y-8 p-6">
      <h1 className="text-2xl font-bold">History</h1>
      {lanes.map((lane) => {
        const streak = computeStreak(
          lane.checkIns.map((c) => ({ date: c.date, isRest: c.isRest })),
          today
        )
        const byDay = new Map(
          lane.checkIns.map((c) => [utcMidnight(c.date).getTime(), c])
        )
        return (
          <section key={lane.id} className="space-y-2">
            <h2 className="text-lg font-semibold">
              {lane.emoji} {lane.name} — {streak}🔥
            </h2>
            <div className="grid grid-cols-10 gap-1">
              {days.map((d) => {
                const c = byDay.get(d.getTime())
                const cls = c
                  ? c.isRest
                    ? "bg-blue-300"
                    : "bg-green-400"
                  : "bg-zinc-200"
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
