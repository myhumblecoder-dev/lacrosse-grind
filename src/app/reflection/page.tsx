import { prisma as db } from "@/lib/db"
import { getWeekStart, formatWeekLabel } from "@/lib/weekUtils"
import { getTrainingDay } from "@/lib/trainingDay"
import { createReflection } from "@/app/actions/createReflection"
import { editReflection } from "@/app/actions/editReflection"
import { deleteReflection } from "@/app/actions/deleteReflection"
import ReflectionForm from "@/components/ReflectionForm"
import ReflectionList from "@/components/ReflectionList"

export const dynamic = "force-dynamic"

export default async function ReflectionPage() {
  const weekStart = getWeekStart(getTrainingDay(new Date()))

  const allReflections = await db.weeklyReflection.findMany({
    orderBy: { weekStarting: "desc" },
  })

  const currentWeekReflection = allReflections.find(
    (r) => r.weekStarting.getTime() === weekStart.getTime()
  )

  const reflectionsForList = allReflections.map((r) => ({
    id: r.id,
    weekLabel: formatWeekLabel(r.weekStarting),
    playerNote: r.playerNote,
    coachSummary: r.coachSummary,
    isCurrentWeek: r.weekStarting.getTime() === weekStart.getTime(),
  }))

  return (
    <main className="max-w-2xl mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-bold">Weekly Reflection</h1>
      <p className="mt-1 text-sm text-zinc-500">
        A weekly space to reflect on how training felt. Your coach summary keeps it effort-focused.
      </p>

      {!currentWeekReflection && (
        <ReflectionForm
          weekStarting={weekStart}
          createReflection={async (data) => {
            "use server"
            const r = await createReflection(data)
            return { coachSummary: r.ok ? r.coachSummary : undefined }
          }}
        />
      )}

      {reflectionsForList.length > 0 && (
        <section className="space-y-3 border-t border-zinc-800 pt-6">
          <h2 className="text-lg font-semibold">Reflections</h2>
          <ReflectionList
            reflections={reflectionsForList}
            editReflection={async (id, playerNote) => {
              "use server"
              return editReflection(id, playerNote)
            }}
            deleteReflection={async (id) => {
              "use server"
              return deleteReflection(id)
            }}
          />
        </section>
      )}
    </main>
  )
}
