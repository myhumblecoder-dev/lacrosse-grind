import { prisma } from "@/lib/db"
import { computeStreak } from "@/lib/streak"
import { getWeekStart } from "@/lib/weekUtils"
import { createCheckIn } from "@/app/actions/createCheckIn"
import { deleteCheckIn } from "@/app/actions/deleteCheckIn"
import CheckInCard from "@/components/CheckInCard"
import { WeeklyProgress } from "@/components/WeeklyProgress"

export const dynamic = "force-dynamic"

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export default async function DashboardPage() {
  const today = utcMidnight(new Date())
  const weekStart = getWeekStart(today)

  const lanes = await prisma.lane.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      checkIns: { where: { date: { gte: weekStart } }, orderBy: { date: "asc" } },
    },
  })

  return (
    <main className="max-w-2xl mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-bold">Today</h1>
      <p className="mt-1 text-sm text-zinc-500">Your daily check-in. Show up for each lane — effort and consistency are the only score, and rest days count too.</p>
      {lanes.length === 0 && (
        <p className="text-zinc-500">No lanes yet — add one on the Lanes page.</p>
      )}
      {lanes.map((lane) => {
        const todayCheckIn = lane.checkIns.find(
          (c) => c.date.getTime() === today.getTime()
        )
        const weeklyHits = lane.checkIns.length
        const streak = computeStreak(
          lane.checkIns.map((c) => ({ date: c.date, isRest: c.isRest })),
          today
        )
        return (
          <div key={lane.id} className="space-y-2 rounded-lg border p-4">
            <CheckInCard
              lane={{ id: lane.id, name: lane.name, emoji: lane.emoji }}
              streak={streak}
              checkedIn={!!todayCheckIn}
              isRest={todayCheckIn?.isRest ?? false}
              today={today.toISOString()}
              createCheckIn={async (params) => {
                "use server"
                await createCheckIn(params)
              }}
              deleteCheckIn={async (laneId, date) => {
                "use server"
                await deleteCheckIn(laneId, date)
              }}
            />
            <WeeklyProgress hits={weeklyHits} target={lane.targetPerWeek} />
          </div>
        )
      })}
    </main>
  )
}
