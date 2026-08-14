import { prisma as db } from "@/lib/db"
import { getLastCompletedWeekStart, getWeekStart, formatWeekLabel } from "@/lib/weekUtils"
import { getTrainingDay } from "@/lib/trainingDay"
import { createBossBattle } from "@/app/actions/createBossBattle"
import BossBattleForm from "@/components/BossBattleForm"
import BossBattleSwapTrigger from "@/components/BossBattleSwapTrigger"
import { swapLane } from "@/app/actions/swapLane"
import { validateSwap } from "@/lib/validateSwap"

export const dynamic = "force-dynamic"

export default async function BossBattlesPage() {
  const trainingDay = getTrainingDay(new Date())
  const weekStart = getLastCompletedWeekStart(trainingDay)
  const thisWeekStart = getWeekStart(trainingDay)

  const lanes = await db.lane.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      checkIns: {
        where: {
          date: { gte: weekStart, lt: thisWeekStart },
        },
      },
      bossBattles: {
        where: { weekStarting: weekStart },
      },
    },
  })

  // What a lane change would cost right now, decided once for the page.
  const inactiveLanes = await db.lane.findMany({
    where: { isActive: false },
    select: { id: true, name: true, emoji: true },
  })
  const swapState = validateSwap(lanes.length)

  return (
    <main className="max-w-2xl mx-auto space-y-8 p-6">
      <h1 className="text-2xl font-bold">
        Boss Battles — week of {formatWeekLabel(weekStart)}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Finish a lane's weekly target and you unlock its boss battle — describe how the week went. The coach note is about your process, never a grade.
      </p>

      {lanes.length === 0 && (
        <p className="text-zinc-500">No active lanes yet.</p>
      )}

      {lanes.map((lane) => {
        const hits = lane.checkIns.length
        const hitTarget = hits >= lane.targetPerWeek
        const existing = lane.bossBattles[0]

        return (
          <section key={lane.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {lane.emoji} {lane.name}
              </h2>
              <span className="text-sm text-zinc-600">
                {hits} / {lane.targetPerWeek} days
              </span>
            </div>

            {hitTarget ? (
              <div className="space-y-3">
                <div className="text-sm font-medium text-green-600">
                  ✅ Target hit
                </div>
                <BossBattleForm
                  laneId={lane.id}
                  laneName={lane.name}
                  weekStarting={weekStart}
                  existingReport={existing?.selfReport}
                  existingCoachNote={existing?.coachNote ?? undefined}
                  createBossBattle={async (data) => {
                      "use server"
                    const r = await createBossBattle(data)
                    return { coachNote: r.ok ? r.coachNote : undefined }
                  }}
                />
                {existing && (
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
              <p className="text-zinc-500 text-sm">No battle this week — target missed.</p>
            )}
          </section>
        )
      })}
    </main>
  )
}
