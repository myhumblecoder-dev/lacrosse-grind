import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUserId, requirePlayerId } from "@/lib/tenancy";
import { isWithinCheckInWindow } from "@/lib/checkInWindow";
import { getTrainingDay } from "@/lib/trainingDay";

/**
 * Undo a check-in — the button on today's card.
 *
 * Bounded to the same window `createCheckIn` enforces, so Undo stays symmetric
 * with the button that made the row. That is not an oversight about older days:
 * an earlier day goes through `withdrawCheckIn`, which asks for the witness
 * passphrase and leaves a `CheckInRemoval` behind. Unbounded, this action could
 * quietly erase any day of the season from a page that only ever shows today.
 *
 * Scoped by `playerId`, not `userId`: on an account with two kids, a userId
 * scope let a call reach the other kid's lane.
 *
 * Refuses a day a witness put on the record. Undo asks for no passphrase and
 * leaves no `CheckInRemoval`, so without this guard the one path that bypasses
 * both could erase a parent's attestation — and today IS inside the amend
 * window, so an attested day can land on this very card. Taking an attested day
 * back off goes through `withdrawCheckIn` like any other withdrawal.
 */
export async function deleteCheckIn(
  laneId: string,
  date: Date
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const playerId = await requirePlayerId(userId);

  if (!isWithinCheckInWindow(date, getTrainingDay(new Date()))) {
    return { ok: false, error: "outside-window" };
  }

  const existing = await prisma.checkIn.findFirst({
    where: { laneId, date, lane: { playerId } },
    select: { attestedAt: true },
  });

  if (!existing) {
    return { ok: false, error: "not-found" };
  }

  if (existing.attestedAt !== null) {
    return { ok: false, error: "attested" };
  }

  const { count } = await prisma.checkIn.deleteMany({
    where: {
      laneId,
      date,
      lane: { playerId },
    },
  });

  if (count !== 1) {
    return { ok: false, error: "not-found" };
  }

  revalidatePath("/");
  return { ok: true };
}
