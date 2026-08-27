import { prisma } from "@/lib/db"
import { getViewer, type Viewer } from "@/lib/viewer"
import { getDemoSeason } from "@/lib/demoSeason"
import { promptSignIn } from "@/app/actions/promptSignIn"
import DemoBanner from "@/components/DemoBanner"
import { createLane } from "@/app/actions/createLane"
import { updateLane } from "@/app/actions/updateLane"
import { setLaneActive } from "@/app/actions/setLaneActive"
import { deleteLane } from "@/app/actions/deleteLane"
import { swapLane } from "@/app/actions/swapLane"
import { validateSwap } from "@/lib/validateSwap"
import { playerLevel } from "@/lib/playerLevel"
import { requiredLanes } from "@/lib/laneRequirement"
import LaneList from "@/components/LaneList"
import LaneForm from "@/components/LaneForm"
import { getWeekStart } from "@/lib/weekUtils"
import { getTrainingDay } from "@/lib/trainingDay"

export const dynamic = "force-dynamic"

/** Lanes, the season flag and the defeat count, from the database or the demo. */
async function loadLanes(viewer: Viewer, today: Date) {
  if (viewer.kind === "demo") {
    const demo = getDemoSeason(today)
    const lanes = [...demo.lanes].sort(
      (a, b) => Number(b.isActive) - Number(a.isActive) || a.sortOrder - b.sortOrder
    )
    return { lanes, seasonRunning: true, defeats: demo.defeats }
  }

  const { playerId } = viewer
  const [lanes, prize, defeats] = await Promise.all([
    prisma.lane.findMany({
      where: { playerId },
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }],
      include: { targetChanges: true },
    }),
    // A running season refuses lane deletes, so the page says so up front
    // rather than letting the confirm button do nothing.
    prisma.prize.findUnique({ where: { playerId } }),
    prisma.bossBattle.count({
      where: { completedAt: { not: null }, lane: { playerId } },
    }),
  ])

  return { lanes, seasonRunning: Boolean(prize?.seasonStart), defeats }
}

export default async function LanesPage() {
  const viewer = await getViewer()
  const isDemo = viewer.kind === "demo"
  const today = getTrainingDay(new Date())
  const weekStart = getWeekStart(today)

  const { lanes, seasonRunning, defeats } = await loadLanes(viewer, today)

  // The floor governs every lane change, so the page decides once what is
  // legal right now and hands the answer down.
  const activeLaneCount = lanes.filter((l) => l.isActive).length
  const demand = requiredLanes(playerLevel(defeats).level)
  const swapState = validateSwap(activeLaneCount, demand)
  // Signed-out visitors get the sign-in prompt instead of a write.
  const gate = async () => {
    "use server"
    await promptSignIn()
  }

  const inactiveLanes = lanes
    .filter((l) => !l.isActive)
    .map((l) => ({ id: l.id, name: l.name, emoji: l.emoji }))

  return (
    <main className="max-w-2xl mx-auto space-y-6 p-6">
      {isDemo && <DemoBanner />}
      <h1 className="text-2xl font-bold">Lanes</h1>
      <p className="mt-1 text-sm text-zinc-500">
        The skills you are training. Add a lane, set a weekly target, and toggle,
        edit, or remove them.
      </p>
      <LaneList
        lanes={lanes}
        weekStart={weekStart}
        seasonRunning={seasonRunning}
        updateLane={isDemo ? gate : async (id, patch) => {
          "use server"
          return updateLane(id, patch)
        }}
        setActive={isDemo ? gate : async (id, isActive) => {
          "use server"
          return setLaneActive(id, isActive)
        }}
        deleteLane={isDemo ? gate : async (id) => {
          "use server"
          return deleteLane(id)
        }}
        swapState={swapState}
        requiredLanes={demand}
        inactiveLanes={inactiveLanes}
        onSwapLane={isDemo ? gate : async (outLaneId, inLaneId) => {
          "use server"
          return swapLane({ outLaneId, inLaneId })
        }}
      />
      <div className="border-t pt-6">
        <h2 className="mb-3 text-lg font-semibold">Add a lane</h2>
        <LaneForm
          createLane={isDemo ? gate : async (data) => {
            "use server"
            return createLane(data)
          }}
        />
      </div>
    </main>
  )
}
