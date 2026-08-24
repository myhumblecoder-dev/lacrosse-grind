import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/tenancy"
import { computeStreak } from "@/lib/streak"
import { getWeekStart } from "@/lib/weekUtils"
import { getTrainingDay } from "@/lib/trainingDay"
import { createCheckIn } from "@/app/actions/createCheckIn"
import { deleteCheckIn } from "@/app/actions/deleteCheckIn"
import CheckInCard from "@/components/CheckInCard"
import LanePendingCard from "@/components/LanePendingCard"
import { isLanePending } from "@/lib/lanePending"
import { effectiveTarget } from "@/lib/effectiveTarget"
import { WeeklyProgress } from "@/components/WeeklyProgress"
import SeasonStartButton from "@/components/SeasonStartButton"
import SeasonResetButton from "@/components/SeasonResetButton"
import SeasonSetupPanel from "@/components/SeasonSetupPanel"
import SeasonTimelineNote from "@/components/SeasonTimelineNote"
import { getSeasonReadiness } from "@/lib/seasonReadiness"
import PlayerAvatarCard from "@/components/PlayerAvatarCard"
import { FreezeBadge } from "@/components/FreezeBadge"
import { playerLevel } from "@/lib/playerLevel"
import { requiredLanes } from "@/lib/laneRequirement"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const userId = await requireUserId()
  const today = getTrainingDay(new Date())
  const weekStart = getWeekStart(today)

  const [prize, activeLaneCount, defeats] = await Promise.all([
    prisma.prize.findUnique({ where: { userId } }),
    prisma.lane.count({ where: { isActive: true, userId } }),
    prisma.bossBattle.count({
      where: { completedAt: { not: null }, lane: { userId } },
    }),
  ])

  const rank = playerLevel(defeats)
  const demand = requiredLanes(rank.level)
  const readiness = getSeasonReadiness(activeLaneCount, Boolean(prize), demand)
  const freezeRows = await prisma.streakFreeze.groupBy({
    by: ["laneId"],
    where: { usedDate: null, lane: { userId } },
    _count: { _all: true },
  })
  const freezesByLane = new Map(freezeRows.map((r) => [r.laneId, r._count._all]))
  const hasStarted = Boolean(prize?.seasonStart)

  const allLanes = await prisma.lane.findMany({
    where: { isActive: true, userId },
    orderBy: { sortOrder: "asc" },
    include: {
      checkIns: { where: { date: { gte: weekStart } }, orderBy: { date: "asc" } },
      targetChanges: true,
    },
  })

  // Lanes that haven't reached their first week sort below the live ones, so
  // the set he can actually train today reads first.
  const lanes = allLanes.filter((l) => !isLanePending(l.startsOn, weekStart))
  const pendingLanes = allLanes.filter((l) => isLanePending(l.startsOn, weekStart))

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

      <PlayerAvatarCard defeats={defeats} />

      {hasStarted && activeLaneCount < demand && (
        <Link
          href="/lanes"
          data-testid="lane-hunger"
          className="block rounded-lg border border-purple-500/40 bg-purple-500/10 p-3 text-sm text-purple-200"
        >
          Your {rank.name.charAt(0).toUpperCase() + rank.name.slice(1)} hungers
          for lane number {activeLaneCount + 1} — add one to feed it →
        </Link>
      )}

      <h1 className="text-2xl font-bold">Today</h1>
      <p className="mt-1 text-sm text-zinc-500">Your daily check-in. Show up for each lane — effort and consistency are the only score, and rest days count too.</p>
      {allLanes.length === 0 && (
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
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <WeeklyProgress
                  hits={weeklyHits}
                  target={effectiveTarget(
                    lane.targetChanges,
                    weekStart,
                    lane.targetPerWeek
                  )}
                />
              </div>
              {(freezesByLane.get(lane.id) ?? 0) > 0 && (
                <FreezeBadge availableFreezes={freezesByLane.get(lane.id) ?? 0} />
              )}
            </div>
          </div>
        )
      })}

      {pendingLanes.map((lane) => (
        <LanePendingCard
          key={lane.id}
          lane={{ name: lane.name, emoji: lane.emoji }}
          startsOn={lane.startsOn!}
        />
      ))}

      {hasStarted && <SeasonResetButton />}
    </main>
  )
}
