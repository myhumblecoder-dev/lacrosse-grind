import { prisma } from "@/lib/db"
import { getWeekStart } from "@/lib/weekUtils"
import { createReflection } from "@/app/actions/createReflection"
import ReflectionForm from "@/components/ReflectionForm"

export const dynamic = "force-dynamic"

function utcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export default async function ReflectionPage() {
  const weekStart = getWeekStart(utcMidnight(new Date()))
  const reflection = await prisma.weeklyReflection.findUnique({
    where: { weekStarting: weekStart },
  })

  return (
    <main className="max-w-2xl mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-bold">Weekly Reflection</h1>
      <ReflectionForm
        weekStarting={weekStart}
        existingNote={reflection?.playerNote}
        existingCoachSummary={reflection?.coachSummary ?? undefined}
        createReflection={async (data) => {
          "use server"
          await createReflection(data)
          return {}
        }}
      />
    </main>
  )
}
