import { prisma } from "@/lib/db"
import { generate } from "@/lib/llm"
import { revalidatePath } from "next/cache"
import { requireUserId } from "@/lib/tenancy"
import { getTrainingDay } from "@/lib/trainingDay"
import { coachCapExceeded } from "@/lib/llmCap"

export async function editReflection(
  id: string,
  playerNote: string
): Promise<{ ok: true; coachSummary: string } | { ok: false; error: string }> {
  const userId = await requireUserId()

  if (!id) return { ok: false, error: "missing-id" }

  const note = (playerNote ?? "").trim()
  if (note.length === 0 || note.length > 500) {
    return { ok: false, error: "validation" }
  }

  const existing = await prisma.weeklyReflection.findFirst({
    where: { id, userId },
  })

  if (!existing) {
    return { ok: false, error: "not-found" }
  }

  const todayStart = getTrainingDay(new Date())
  const todayCount = await prisma.weeklyReflection.count({
    where: { userId, createdAt: { gte: todayStart } },
  })

  if (coachCapExceeded(todayCount, process.env.COACH_DAILY_LIMIT)) {
    return { ok: false, error: "coach-limit" }
  }

  const prompt = `You are an effort-focused coach. Summarize the player's weekly reflection in 2-3 encouraging, process-framed sentences — never grades, never 'great job' filler: "${note}".`
  const coachSummary = await generate(prompt)

  await prisma.weeklyReflection.update({
    where: { id },
    data: { playerNote: note, coachSummary },
  })

  revalidatePath("/reflection")
  return { ok: true, coachSummary }
}
