import { prisma } from "@/lib/db"
import { requireUserId } from "@/lib/tenancy"
import { createLane } from "@/app/actions/createLane"
import { updateLane } from "@/app/actions/updateLane"
import { setLaneActive } from "@/app/actions/setLaneActive"
import { deleteLane } from "@/app/actions/deleteLane"
import { swapLane } from "@/app/actions/swapLane"
import { validateSwap } from "@/lib/validateSwap"
import LaneList from "@/components/LaneList"
import LaneForm from "@/components/LaneForm"

export const dynamic = "force-dynamic"

export default async function LanesPage() {
  const userId = await requireUserId()
  const lanes = await prisma.lane.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }],
  })

  // The floor of three governs every lane change, so the page decides once
  // what is legal right now and hands the answer down.
  const activeLaneCount = lanes.filter((l) => l.isActive).length
  const swapState = validateSwap(activeLaneCount)
  const inactiveLanes = lanes
    .filter((l) => !l.isActive)
    .map((l) => ({ id: l.id, name: l.name, emoji: l.emoji }))

  return (
    <main className="max-w-2xl mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-bold">Lanes</h1>
      <p className="mt-1 text-sm text-zinc-500">
        The skills you are training. Add a lane, set a weekly target, and toggle,
        edit, or remove them.
      </p>
      <LaneList
        lanes={lanes}
        updateLane={async (id, patch) => {
          "use server"
          return updateLane(id, patch)
        }}
        setActive={async (id, isActive) => {
          "use server"
          return setLaneActive(id, isActive)
        }}
        deleteLane={async (id) => {
          "use server"
          return deleteLane(id)
        }}
        swapState={swapState}
        inactiveLanes={inactiveLanes}
        onSwapLane={async (outLaneId, inLaneId) => {
          "use server"
          return swapLane({ outLaneId, inLaneId })
        }}
      />
      <div className="border-t pt-6">
        <h2 className="mb-3 text-lg font-semibold">Add a lane</h2>
        <LaneForm
          createLane={async (data) => {
            "use server"
            return createLane(data)
          }}
        />
      </div>
    </main>
  )
}
