import { prisma } from "@/lib/db"
import { createLane } from "@/app/actions/createLane"
import LaneList from "@/components/LaneList"
import LaneForm from "@/components/LaneForm"

export const dynamic = "force-dynamic"

export default async function LanesPage() {
  const lanes = await prisma.lane.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }],
  })

  return (
    <main className="max-w-2xl mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-bold">Lanes</h1>
      <LaneList lanes={lanes} />
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
