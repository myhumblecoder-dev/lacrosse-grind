import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function setLaneActive(
  id: string,
  isActive: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!id) return { ok: false, error: "missing-id" }

  try {
    await prisma.lane.update({ where: { id }, data: { isActive } })
  } catch {
    return { ok: false, error: "not-found" }
  }

  revalidatePath("/lanes")
  revalidatePath("/")
  return { ok: true }
}
