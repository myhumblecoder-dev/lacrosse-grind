import { prisma } from "@/lib/db"
import { generate } from "@/lib/llm"
import { revalidatePath } from "next/cache"

export async function editReflection(
  id: string,
  playerNote: string
): Promise<{ ok: true; coachSummary: string } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "missing-id" }

  const note = (playerNote ?? "").trim()
  if (note.length === 0 || note.length > 500) {
    return { ok: false, error: "validation" }
  }

  const prompt = `You are an effort-focused coach. Summarize Eddie's weekly reflection in 2-3 encouraging, process-framed sentences — never grades, never 'great job' filler: "${note}".`
  const coachSummary = await generate(prompt)

  await prisma.weeklyReflection.update({
    where: { id },
    data: { playerNote: note, coachSummary },
  })

  revalidatePath("/reflection")
  return { ok: true, coachSummary }
}
