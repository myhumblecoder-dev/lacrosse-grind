import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function deleteReflection(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "missing-id" }

  try {
    await prisma.weeklyReflection.delete({ where: { id } })
  } catch {
    return { ok: false, error: "not-found" }
  }

  revalidatePath("/reflection")
  return { ok: true }
}
