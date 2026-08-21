import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { requireUserId } from "@/lib/tenancy"

export async function setLaneActive(
  id: string,
  isActive: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId()
  if (!id) return { ok: false, error: "missing-id" }

  try {
    const { count } = await prisma.lane.updateMany({
      where: { id, userId },
      data: { isActive },
    })

    if (count !== 1) {
      return { ok: false, error: "not-found" }
    }
  } catch (err) {
    return { ok: false, error: "not-found" }
  }

  revalidatePath("/lanes")
  revalidatePath("/")
  return { ok: true }
}