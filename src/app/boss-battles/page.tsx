import { prisma } from "@/lib/db"
import { get2WeekBlockStart, formatWeekLabel } from "@/lib/weekUtils"
import { createBossBattle } from "@/app/actions/createBossBattle"
import BossBattleForm from "@/components/BossBattleForm"

export const dynamic = "force-dynamic"

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export default async function BossBattlesPage() {
  const blockStart = get2WeekBlockStart(utcMidnight(new Date()))

  const lanes = await prisma.lane.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { bossBattles: { where: { weekStarting: blockStart } } },
  })

  return (
    <main className="max-w-2xl mx-auto space-y-8 p-6">
      <h1 className="text-2xl font-bold">
        Boss Battles — {formatWeekLabel(blockStart)}
      </h1>
      {lanes.length === 0 && (
        <p className="text-zinc-500">No active lanes yet.</p>
      )}
      {lanes.map((lane) => {
        const existing = lane.bossBattles[0]
        return (
          <section key={lane.id} className="space-y-3 rounded-lg border p-4">
            <h2 className="text-lg font-semibold">
              {lane.emoji} {lane.name}
            </h2>
            <BossBattleForm
              laneId={lane.id}
              laneName={lane.name}
              weekStarting={blockStart}
              existingReport={existing?.selfReport}
              existingCoachNote={existing?.coachNote ?? undefined}
              createBossBattle={async (data) => {
                "use server"
                await createBossBattle(data)
                return {}
              }}
            />
          </section>
        )
      })}
    </main>
  )
}
