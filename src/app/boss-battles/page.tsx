import { prisma as db } from "@/lib/db"
import { requireUserId } from "@/lib/tenancy"
import { getWeekStart, formatWeekLabel, getLastCompletedWeekStart } from "@/lib/weekUtils"
import { getTrainingDay } from "@/lib/trainingDay"
import { generateBossChallenge } from "@/app/actions/generateBossChallenge"
import { rerollBossChallenge } from "@/app/actions/rerollBossChallenge"
import { completeBossBattle } from "@/app/actions/completeBossBattle"
import BossChallengeCard from "@/components/BossChallengeCard"
import BossBattleSwapTrigger from "@/components/BossBattleSwapTrigger"
import { swapLane } from "@/app/actions/swapLane"
import { validateSwap } from "@/lib/validateSwap"

export const dynamic = "force-dynamic"

type Battle = {
  id: string
  weekStarting: Date
  challenge: string | null
  rerolled: boolean
  completedAt: Date | null
  coachNote: string | null
}

function challengeCard(laneId: string, weekStarting: Date, battle: Battle | undefined) {
  return (
    <BossChallengeCard
      challenge={battle?.challenge ?? null}
      rerolled={battle?.rerolled ?? false}
      completedAt={battle?.completedAt ?? null}
      coachNote={battle?.coachNote ?? null}
      onFace={async () => {
        "use server"
        await generateBossChallenge(laneId, weekStarting)
      }}
      onReroll={async () => {
        "use server"
        if (battle) await rerollBossChallenge(battle.id)
      }}
      onComplete={async () => {
        "use server"
        if (!battle) return
        const r = await completeBossBattle(battle.id)
        if (r.ok) {
          return { leveledUp: r.leveledUp, newLevel: r.newLevel, levelName: r.levelName }
        }
      }}
    />
  )
}

export default async function BossBattlesPage() {
  const userId = await requireUserId()
  const trainingDay = getTrainingDay(new Date())
  const thisWeekStart = getWeekStart(trainingDay)
  const lastWeekStart = getLastCompletedWeekStart(trainingDay)

  const lanes = await db.lane.findMany({
    where: { isActive: true, userId },
    orderBy: { sortOrder: "asc" },
    include: {
      checkIns: {
        where: {
          date: { gte: lastWeekStart },
        },
      },
      bossBattles: {
        where: {
          weekStarting: { in: [lastWeekStart, thisWeekStart] },
        },
      },
    },
  })

  // What a lane change would cost right now, decided once for the page.
  const inactiveLanes = await db.lane.findMany({
    where: { isActive: false, userId },
    select: { id: true, name: true, emoji: true },
  })
  const swapState = validateSwap(lanes.length)

  // A last-week boss stays fightable for one grace week when its target was
  // hit but the boss was never DEFEATED.
  const graceLanes = lanes.filter((lane) => {
    const lastWeekHits = lane.checkIns.filter(
      (c) => c.date >= lastWeekStart && c.date < thisWeekStart
    ).length
    const lastWeekBattle = lane.bossBattles.find(
      (b) => b.weekStarting.getTime() === lastWeekStart.getTime()
    )
    return lastWeekHits >= lane.targetPerWeek && !lastWeekBattle?.completedAt
  })

  return (
    <main className="max-w-2xl mx-auto space-y-8 p-6">
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
        const currentHits = lane.checkIns.filter((c) => c.date >= thisWeekStart).length
        const hitTarget = currentHits >= lane.targetPerWeek
        const battle = lane.bossBattles.find(
          (b) => b.weekStarting.getTime() === thisWeekStart.getTime()
        )

        return (
          <section key={lane.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {lane.emoji} {lane.name}
              </h2>
              <span className="text-sm text-zinc-600">
                {currentHits} / {lane.targetPerWeek} days
              </span>
            </div>

            {hitTarget ? (
              <div className="space-y-3">
                <div className="text-sm font-medium text-green-600">
                  ✅ Target hit
                </div>
                {challengeCard(lane.id, thisWeekStart, battle)}
                {battle?.completedAt && (
                  <BossBattleSwapTrigger
                    lane={{ id: lane.id, name: lane.name, emoji: lane.emoji }}
                    inactiveLanes={inactiveLanes}
                    swapState={swapState}
                    onSwapLane={async (outLaneId, inLaneId) => {
                      "use server"
                      return swapLane({ outLaneId, inLaneId })
                    }}
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
                  )
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
