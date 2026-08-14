import { prisma } from "@/lib/db"
import { computeStreak } from "@/lib/streak"
import { getWeekStart } from "@/lib/weekUtils"
import { getTrainingDay } from "@/lib/trainingDay"
import { createCheckIn } from "@/app/actions/createCheckIn"
import { deleteCheckIn } from "@/app/actions/deleteCheckIn"
import CheckInCard from "@/components/CheckInCard"
import { WeeklyProgress } from "@/components/WeeklyProgress"
import SeasonStartButton from "@/components/SeasonStartButton"
import SeasonSetupPanel from "@/components/SeasonSetupPanel"
import SeasonTimelineNote from "@/components/SeasonTimelineNote"
import { getSeasonReadiness } from "@/lib/seasonReadiness"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const today = getTrainingDay(new Date())
  const weekStart = getWeekStart(today)

  const [prize, activeLaneCount] = await Promise.all([
    prisma.prize.findUnique({ where: { id: 'prize' } }),
    prisma.lane.count({ where: { isActive: true } })
  ])

  const readiness = getSeasonReadiness(activeLaneCount, Boolean(prize))
  const hasStarted = Boolean(prize?.seasonStart)

  const lanes = await prisma.lane.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      checkIns: { where: { date: { gte: weekStart } }, orderBy: { date: "asc" } },
    },
  })

  return (
    <main className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="space-y-4">
        <SeasonStartButton hasStarted={hasStarted} isReady={readiness.isReady} />
        {/* Pressing START on a Friday commits Eddie to a season that begins
            on Monday. Without this the button just turned red and nothing
            else changed, which reads as "it didn't work". */}
        <SeasonTimelineNote
          seasonStart={prize?.seasonStart ?? null}
          today={today}
        />
        {!hasStarted && !readiness.isReady && (
          <SeasonSetupPanel 
            laneCount={activeLaneCount} 
            lanesNeeded={readiness.lanesNeeded}
            hasPrize={Boolean(prize)} 
          />
        )}
      </div>

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
