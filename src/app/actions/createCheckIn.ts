import { prisma } from "@/lib/db";
import { checkInSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/tenancy";
import { isWithinCheckInWindow } from "@/lib/checkInWindow";
import { getTrainingDay } from "@/lib/trainingDay";

export async function createCheckIn(
  input: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();

  const parsed = checkInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const { laneId, date, isRest, note } = parsed.data;

  // checkInSchema accepts any Date, and this action is callable directly
  // rather than only through the card that always sends today.
  if (!isWithinCheckInWindow(date, getTrainingDay(new Date()))) {
    return { ok: false, error: "outside-window" };
  }

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