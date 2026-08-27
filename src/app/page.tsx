import { prisma } from "@/lib/db"
import { getViewer, type Viewer } from "@/lib/viewer"
import { getDemoSeason } from "@/lib/demoSeason"
import { promptSignIn } from "@/app/actions/promptSignIn"
import DemoBanner from "@/components/DemoBanner"
import { computeStreak } from "@/lib/streak"
import { countQualifyingHits } from "@/lib/qualifyingWeek"
import { findRepairableGap } from "@/lib/repairableGap"
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
import FreezeOffer from "@/components/FreezeOffer"
import { spendFreeze } from "@/app/actions/spendFreeze"
import { playerLevel } from "@/lib/playerLevel"
import { requiredLanes } from "@/lib/laneRequirement"
import Link from "next/link"

export const dynamic = "force-dynamic"

// A streak runs across weeks, so it cannot be read from this week's rows
// alone — fetching only from Monday silently capped every streak at 7 and
// reset it each Monday. Bounded rather than unbounded: a run older than this
// is well past anything the badge or a freeze can act on.
const STREAK_WINDOW_DAYS = 400

/**
 * Everything Today needs, from the database or from the demo.
 *
 * Split out so the branch narrows the viewer in one place. The two sources
 * return the same shape, which is why nothing downstream — computeStreak,
 * findRepairableGap, effectiveTarget — knows the difference.
 */
async function loadDashboard(viewer: Viewer, today: Date) {
  if (viewer.kind === "demo") {
    const demo = getDemoSeason(today)
    return {
      prize: demo.prize,
      activeLaneCount: demo.lanes.filter((l) => l.isActive).length,
      defeats: demo.defeats,
      lanes: demo.lanes.filter((l) => l.isActive),
    }
  }

  const { playerId } = viewer
  const streakWindowStart = new Date(
    today.getTime() - STREAK_WINDOW_DAYS * 24 * 60 * 60 * 1000
  )

  const [prize, activeLaneCount, defeats, lanes] = await Promise.all([
    prisma.prize.findUnique({ where: { playerId } }),
    prisma.lane.count({ where: { isActive: true, playerId } }),
    prisma.bossBattle.count({
      where: { completedAt: { not: null }, lane: { playerId } },
    }),
    prisma.lane.findMany({
      where: { isActive: true, playerId },
      orderBy: { sortOrder: "asc" },
      include: {
        checkIns: {
          where: { date: { gte: streakWindowStart } },
          orderBy: { date: "asc" },
        },
        targetChanges: true,
        streakFreezes: true,
      },
    }),
  ])

  return { prize, activeLaneCount, defeats, lanes }
}

export default async function DashboardPage() {
  const viewer = await getViewer()
  const isDemo = viewer.kind === "demo"
  const today = getTrainingDay(new Date())
  const weekStart = getWeekStart(today)

  const { prize, activeLaneCount, defeats, lanes: allLanes } =
    await loadDashboard(viewer, today)

  // Every control hands a signed-out visitor to sign-in rather than an action,
  // so the write path is never entered at all.
  const gate = async () => {
    "use server"
    await promptSignIn()
  }

  const rank = playerLevel(defeats)
  const demand = requiredLanes(rank.level)
  const readiness = getSeasonReadiness(activeLaneCount, Boolean(prize), demand)
  const hasStarted = Boolean(prize?.seasonStart)

  // Lanes that haven't reached their first week sort below the live ones, so
  // the set he can actually train today reads first.
  const lanes = allLanes.filter((l) => !isLanePending(l.startsOn, weekStart))
  const pendingLanes = allLanes.filter((l) => isLanePending(l.startsOn, weekStart))

  return (
    <main className="max-w-2xl mx-auto space-y-6 p-6">
      {isDemo && <DemoBanner />}
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
        // Counted the same way the season counts it. Rest days are capped at
        // REST_CAP_PER_WEEK toward a target, so tallying them raw here showed
        // a week as hit that the Prize grid then scored as missed.
        const weeklyHits = countQualifyingHits(lane.checkIns, weekStart)

        const history = lane.checkIns.map((c) => ({
          date: c.date,
          isRest: c.isRest,
        }))
        const frozenDates = lane.streakFreezes
          .map((f) => f.usedDate)
          .filter((d): d is Date => d !== null)
        const freezesAvailable = lane.streakFreezes.filter(
          (f) => f.usedDate === null
        ).length

        const streak = computeStreak(history, today, frozenDates)
        const gap = findRepairableGap(history, today, frozenDates)
        const streakIfRepaired = gap
          ? computeStreak(history, today, [...frozenDates, gap])
          : 0

        return (
          <div key={lane.id} className="space-y-2 rounded-lg border p-4">
            <CheckInCard
              lane={{ id: lane.id, name: lane.name, emoji: lane.emoji }}
              streak={streak}
              checkedIn={!!todayCheckIn}
              isRest={todayCheckIn?.isRest ?? false}
              today={today.toISOString()}
              createCheckIn={isDemo ? gate : async (params) => {
                "use server"
                await createCheckIn(params)
              }}
              deleteCheckIn={isDemo ? gate : async (laneId, date) => {
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
              {freezesAvailable > 0 && (
                <FreezeBadge availableFreezes={freezesAvailable} />
              )}
            </div>

            {gap && (
              <FreezeOffer
                laneId={lane.id}
                missedDate={gap.toISOString()}
                streakIfRepaired={streakIfRepaired}
                freezesAvailable={freezesAvailable}
                spendFreeze={isDemo ? gate : async (laneId, date) => {
                  "use server"
                  return spendFreeze(laneId, date)
                }}
              />
            )}
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

      {/* Not in the demo: wiping a season nobody owns is meaningless, and it
          is the one destructive control on the page. */}
      {hasStarted && !isDemo && <SeasonResetButton />}
    </main>
  )
}
