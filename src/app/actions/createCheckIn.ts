import { prisma } from "@/lib/db";
import { checkInSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { requireUserId, requirePlayerId } from "@/lib/tenancy";
import { isWithinCheckInWindow } from "@/lib/checkInWindow";
import { getTrainingDay } from "@/lib/trainingDay";

export async function createCheckIn(
  input: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const playerId = await requirePlayerId(userId);

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
    where: { id: laneId, playerId },
  });

  if (!lane) {
    return { ok: false, error: "not-found" };
  }

  // A day a witness put on the record is not the player's to rewrite.
  //
  // `deleteCheckIn` already refuses one, but this is the other half of the same
  // card and left the statement editable: the update branch rewrites `isRest`
  // and leaves `attestedAt` standing, so a rest day a parent attested could be
  // flipped to a session that still carries the "Witnessed" badge — the record
  // would keep vouching that a witness said something they did not. Reachable
  // from a stale dashboard tab, which still renders the buttons because its
  // snapshot predates the attestation (#547).
  const existing = await prisma.checkIn.findUnique({
    where: { laneId_date: { laneId, date } },
    select: { attestedAt: true },
  });

  if (existing?.attestedAt != null) {
    return { ok: false, error: "attested" };
  }

  const checkIn = await prisma.checkIn.upsert({
    where: { laneId_date: { laneId, date } },
    update: { isRest, note },
    create: { laneId, date, isRest, note },
  });

  revalidatePath("/");
  return { ok: true, id: checkIn.id };
}