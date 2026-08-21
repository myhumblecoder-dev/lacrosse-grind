import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireUserId } from "@/lib/tenancy"

export async function deleteReflection(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "missing-id" }

  const userId = await requireUserId()

  const { count } = await prisma.weeklyReflection.deleteMany({
    where: { id, userId }
  })

  if (count !== 1) {
    return { ok: false, error: 'not-found' }
  }

  revalidatePath("/reflection")
  return { ok: true }
}