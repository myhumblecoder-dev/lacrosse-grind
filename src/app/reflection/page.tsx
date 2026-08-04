import { prisma } from "@/lib/db"
import { getWeekStart, formatWeekLabel } from "@/lib/weekUtils"
import { createReflection } from "@/app/actions/createReflection"
import { editReflection } from "@/app/actions/editReflection"
import { deleteReflection } from "@/app/actions/deleteReflection"
import ReflectionForm from "@/components/ReflectionForm"
import ReflectionList from "@/components/ReflectionList"

export const dynamic = "force-dynamic"

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export default async function ReflectionPage() {
  const weekStart = getWeekStart(utcMidnight(new Date()))

  const reflection = await prisma.weeklyReflection.findUnique({
    where: { weekStarting: weekStart },
  })

  const past = await prisma.weeklyReflection.findMany({
    where: { weekStarting: { lt: weekStart } },
    orderBy: { weekStarting: "desc" },
  })

  const pastReflections = past.map((r) => ({
    id: r.id,
    weekLabel: formatWeekLabel(r.weekStarting),
    playerNote: r.playerNote,
    coachSummary: r.coachSummary,
  }))

  return (
    <main className="max-w-2xl mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-bold">Weekly Reflection</h1>
      <p className="mt-1 text-sm text-zinc-500">A weekly space to reflect on how training felt. Your coach summary keeps it effort-focused.</p>
      <ReflectionForm
        weekStarting={weekStart}
        existingNote={reflection?.playerNote}
        existingCoachSummary={reflection?.coachSummary ?? undefined}
        createReflection={async (data) => {
          "use server"
          const r = await createReflection(data)
          return { coachSummary: r.ok ? r.coachSummary : undefined }
        }}
      />

      {pastReflections.length > 0 && (
        <section className="space-y-3 border-t border-zinc-800 pt-6">
          <h2 className="text-lg font-semibold">Past reflections</h2>
          <ReflectionList
            reflections={pastReflections}
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
