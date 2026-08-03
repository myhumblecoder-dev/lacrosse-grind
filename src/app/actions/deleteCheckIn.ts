import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function deleteCheckIn(
  laneId: string,
  date: Date
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.checkIn.delete({
      where: { laneId_date: { laneId, date } },
    });
  } catch {
    // Prisma throws when the record doesn't exist.
    return { ok: false, error: "not-found" };
  }

  revalidatePath("/");
  return { ok: true };
}
