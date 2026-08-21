import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/tenancy";

export async function deleteCheckIn(
  laneId: string,
  date: Date
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();

  const { count } = await prisma.checkIn.deleteMany({
    where: {
      laneId,
      date,
      lane: { userId },
    },
  });

  if (count !== 1) {
    return { ok: false, error: "not-found" };
  }

  revalidatePath("/");
  return { ok: true };
}