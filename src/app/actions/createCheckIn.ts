import { prisma } from "@/lib/db";
import { checkInSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/tenancy";

export async function createCheckIn(
  input: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();

  const parsed = checkInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const { laneId, date, isRest, note } = parsed.data;

  const lane = await prisma.lane.findFirst({
    where: { id: laneId, userId },
  });

  if (!lane) {
    return { ok: false, error: "not-found" };
  }

  const checkIn = await prisma.checkIn.upsert({
    where: { laneId_date: { laneId, date } },
    update: { isRest, note },
    create: { laneId, date, isRest, note },
  });

  revalidatePath("/");
  return { ok: true, id: checkIn.id };
}