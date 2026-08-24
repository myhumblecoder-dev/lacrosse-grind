import { prisma as db } from "@/lib/db"
import { getViewer, type Viewer } from "@/lib/viewer"
import { getDemoSeason } from "@/lib/demoSeason"
import { promptSignIn } from "@/app/actions/promptSignIn"
import DemoBanner from "@/components/DemoBanner"
import { getWeekStart, formatWeekLabel, getLastCompletedWeekStart } from "@/lib/weekUtils"
import { getTrainingDay } from "@/lib/trainingDay"
import { generateBossChallenge } from "@/app/actions/generateBossChallenge"
import { rerollBossChallenge } from "@/app/actions/rerollBossChallenge"
import { completeBossBattle } from "@/app/actions/completeBossBattle"
import BossChallengeCard from "@/components/BossChallengeCard"
import BossBattleSwapTrigger from "@/components/BossBattleSwapTrigger"
import { swapLane } from "@/app/actions/swapLane"
import { validateSwap } from "@/lib/validateSwap"
import { playerLevel } from "@/lib/playerLevel"
import { requiredLanes } from "@/lib/laneRequirement"
import { isLanePending } from "@/lib/lanePending"
import { countQualifyingHits } from "@/lib/qualifyingWeek"
import { effectiveTarget } from "@/lib/effectiveTarget"

export const dynamic = "force-dynamic"

type Battle = {
  id: string
  weekStarting: Date
  challenge: string | null
  rerollCount: number
  completedAt: Date | null
  coachNote: string | null
}

/**
 * `gate` is passed for a signed-out visitor: facing, re-rolling and beating a
 * boss all become the sign-in invitation, so the demo never reaches an action
 * — and never spends a coach generation on someone who has not signed up.
 */
function challengeCard(
  laneId: string,
  weekStarting: Date,
  battle: Battle | undefined,
  allowance: number,
  gate: (() => Promise<void>) | null
) {
  return (
    <BossChallengeCard
      challenge={battle?.challenge ?? null}
      rerollsLeft={battle ? Math.max(0, allowance - battle.rerollCount) : allowance}
      completedAt={battle?.completedAt ?? null}
      coachNote={battle?.coachNote ?? null}
      onFace={gate ?? (async () => {
        "use server"
        await generateBossChallenge(laneId, weekStarting)
      })}
      onReroll={gate ?? (async () => {
        "use server"
        if (battle) await rerollBossChallenge(battle.id)
      })}
      onComplete={gate ?? (async () => {
        "use server"
        if (!battle) return
        const r = await completeBossBattle(battle.id)
        if (r.ok) {
          return { leveledUp: r.leveledUp, newLevel: r.newLevel, levelName: r.levelName }
        }
      })}
    />
  )
}

/** Active lanes, the bench and the defeat count, from the database or the demo. */
async function loadBattles(viewer: Viewer, trainingDay: Date) {
  const thisWeekStart = getWeekStart(trainingDay)
  const lastWeekStart = getLastCompletedWeekStart(trainingDay)

  if (viewer.kind === "demo") {
    const demo = getDemoSeason(trainingDay)
    return {
      lanes: demo.lanes.filter((l) => l.isActive),
      inactiveLanes: demo.lanes
        .filter((l) => !l.isActive)
        .map((l) => ({ id: l.id, name: l.name, emoji: l.emoji })),
      defeats: demo.defeats,
    }
  }

  const { userId } = viewer
  const [lanes, inactiveLanes, defeats] = await Promise.all([
    db.lane.findMany({
      where: { isActive: true, userId },
      orderBy: { sortOrder: "asc" },
      include: {
        checkIns: { where: { date: { gte: lastWeekStart } } },
        bossBattles: {
          where: { weekStarting: { in: [lastWeekStart, thisWeekStart] } },
        },
        targetChanges: true,
      },
    }),
    // What a lane change would cost right now, decided once for the page.
    db.lane.findMany({
      where: { isActive: false, userId },
      select: { id: true, name: true, emoji: true },
    }),
    db.bossBattle.count({
      where: { completedAt: { not: null }, lane: { userId } },
    }),
  ])

  return { lanes, inactiveLanes, defeats }
}

export default async function BossBattlesPage() {
  const viewer = await getViewer()
  const isDemo = viewer.kind === "demo"
  const trainingDay = getTrainingDay(new Date())
  const thisWeekStart = getWeekStart(trainingDay)
  const lastWeekStart = getLastCompletedWeekStart(trainingDay)

  const { lanes, inactiveLanes, defeats } = await loadBattles(viewer, trainingDay)

  // Signed-out visitors get the sign-in prompt instead of a write.
  const gate = isDemo
    ? async () => {
        "use server"
        await promptSignIn()
      }
    : null
  const rank = playerLevel(defeats)
  const rerollAllowance = rank.level >= 5 ? 2 : 1
  const swapState = validateSwap(lanes.length, requiredLanes(rank.level))

  // A last-week boss stays fightable for one grace week when its target was
  // hit but the boss was never DEFEATED.
  const graceLanes = lanes.filter((lane) => {
    // Tested against LAST week, the week being judged — not against this one.
    // A lane that only started this Monday was not running then, and a
    // swapped-in lane can still carry check-ins from an earlier stint that
    // would otherwise wake a boss for a week it sat retired.
    if (isLanePending(lane.startsOn, lastWeekStart)) return false
    const lastWeekHits = countQualifyingHits(lane.checkIns, lastWeekStart)
    const lastWeekBattle = lane.bossBattles.find(
      (b) => b.weekStarting.getTime() === lastWeekStart.getTime()
    )
    // Judged by last week's target, which a mid-week edit may since have moved.
    const lastWeekTarget = effectiveTarget(
      lane.targetChanges,
      lastWeekStart,
      lane.targetPerWeek
    )
    return lastWeekHits >= lastWeekTarget && !lastWeekBattle?.completedAt
  })

  return (
    <main className="max-w-2xl mx-auto space-y-8 p-6">
      {isDemo && <DemoBanner />}
      <h1 className="text-2xl font-bold">
        Boss Battles — week of {formatWeekLabel(thisWeekStart)}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Finish a lane's weekly target to wake its boss — the coach conjures a
        challenge and you beat it in the real world. Bosses fall to showing up,
        never to stats.
      </p>

      {lanes.length === 0 && (
        <p className="text-zinc-500">No active lanes yet.</p>
      )}

      {lanes.map((lane) => {
        const pending = isLanePending(lane.startsOn, thisWeekStart)
        // The season's own counter, so a boss cannot wake on a week the Prize
        // grid will score as missed.
        const currentHits = countQualifyingHits(lane.checkIns, thisWeekStart)
        const target = effectiveTarget(
          lane.targetChanges,
          thisWeekStart,
          lane.targetPerWeek
        )
        const hitTarget = currentHits >= target
        const battle = lane.bossBattles.find(
          (b) => b.weekStarting.getTime() === thisWeekStart.getTime()
        )

        return (
          <section key={lane.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {lane.emoji} {lane.name}
              </h2>
              {/* A lane that has not started owes no tally — printing "0 / 5
                  days" for a week it was not in is the same deficit the
                  dashboard refuses to show. */}
              {!pending && (
                <span className="text-sm text-zinc-600">
                  {currentHits} / {target} days
                </span>
              )}
            </div>

            {pending ? (
              <p className="text-sm text-purple-300" data-testid="battle-pending">
                ⏳ New lane — its first boss wakes{" "}
                {formatWeekLabel(lane.startsOn!)}.
              </p>
            ) : hitTarget || battle ? (
              /* `|| battle` keeps a boss already woken or already beaten on
                 screen. A battle row only exists because the target was hit at
                 the time, and hiding a victory behind "hit your target" if the
                 tally later reads lower would take back something earned. */
              <div className="space-y-3">
                {hitTarget && (
                  <div className="text-sm font-medium text-green-600">
                    ✅ Target hit
                  </div>
                )}
                {challengeCard(lane.id, thisWeekStart, battle, rerollAllowance, gate)}
                {battle?.completedAt && (
                  <BossBattleSwapTrigger
                    lane={{ id: lane.id, name: lane.name, emoji: lane.emoji }}
                    inactiveLanes={inactiveLanes}
                    swapState={swapState}
                    onSwapLane={gate ?? (async (outLaneId, inLaneId) => {
                      "use server"
                      return swapLane({ outLaneId, inLaneId })
                    })}
                  />
                )}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm" data-testid="battle-locked">
                Hit your target to unlock this week's boss.
              </p>
            )}
          </section>
        )
      })}

      {graceLanes.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">
            Last week's unfought boss — {formatWeekLabel(lastWeekStart)}
          </h2>
          <div className="grid gap-4">
            {graceLanes.map((lane) => (
              <div key={lane.id} className="rounded-lg border p-4">
                <div className="mb-3 font-medium">
                  {lane.emoji} {lane.name}
                </div>
                {challengeCard(
                  lane.id,
                  lastWeekStart,
                  lane.bossBattles.find(
                    (b) => b.weekStarting.getTime() === lastWeekStart.getTime()
                  ),
                  rerollAllowance,
                  gate
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
