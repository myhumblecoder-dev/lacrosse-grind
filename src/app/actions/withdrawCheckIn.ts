import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUserId, requirePlayerId } from "@/lib/tenancy";
import { withdrawCheckInSchema } from "@/lib/validation";
import { verifyWitnessPassphrase } from "@/lib/witnessPassphrase";
import { isWithinAmendWindow } from "@/lib/amendWindow";
import { getTrainingDay } from "@/lib/trainingDay";

/**
 * Take a day back off the record.
 *
 * Deletes the `CheckIn` row and writes a `CheckInRemoval` in one transaction, so
 * the record of the withdrawal cannot exist without the withdrawal, or the other
 * way round. Deleting rather than flagging keeps every reader — the dashboard,
 * History, weekRecap, streak, qualifyingWeek, the demo season, boss battles, the
 * prize grid — honest without a filter any one of them could forget.
 *
 * Does NOT re-spend a freeze token. `spendFreeze` is the only thing allowed to
 * spend one, and `FreezeOffer` will offer again on the next render if the gap
 * turns out to be worth it.
 *
 * Does NOT touch a boss battle. `completedAt` and the `defeats` count that
 * drives avatar level never unwind: he beat that boss in the backyard, and a day
 * coming off the record does not undo it. One caveat on the DISPLAY of that,
 * which this action cannot fix from here: `buildWeekRecaps` derives its weeks
 * from the check-ins, so withdrawing a lane's only check-in of a week drops the
 * whole lane-week row and the victory's purple square with it. The battle row is
 * untouched; History just has nowhere to draw it. Tracked separately.
 */
export async function withdrawCheckIn(
  input: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const playerId = await requirePlayerId(userId);

  const parsed = withdrawCheckInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const { laneId, date, note, passphrase } = parsed.data;

  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { witnessHash: true },
  });

  if (!account?.witnessHash) {
    return { ok: false, error: "no-passphrase" };
  }

  if (!verifyWitnessPassphrase(passphrase, account.witnessHash)) {
    return { ok: false, error: "bad-passphrase" };
  }

  const lane = await prisma.lane.findFirst({
    where: { id: laneId, playerId },
    select: { id: true, startsOn: true },
  });

  if (!lane) {
    return { ok: false, error: "not-found" };
  }

  const prize = await prisma.prize.findUnique({
    where: { playerId },
    select: { seasonStart: true },
  });

  const withinWindow = isWithinAmendWindow(date, getTrainingDay(new Date()), {
    laneStartsOn: lane.startsOn,
    seasonStart: prize?.seasonStart ?? null,
  });

  if (!withinWindow) {
    return { ok: false, error: "outside-window" };
  }

  const existing = await prisma.checkIn.findUnique({
    where: { laneId_date: { laneId, date } },
    select: { isRest: true },
  });

  // Nothing to withdraw from a day that was never marked.
  if (!existing) {
    return { ok: false, error: "not-found" };
  }

  try {
    await prisma.$transaction([
      prisma.checkIn.delete({ where: { laneId_date: { laneId, date } } }),
      prisma.checkInRemoval.create({
        data: { laneId, date, wasRest: existing.isRest, note: note ?? null },
      }),
    ]);
  } catch (err) {
    // A row deleted by another tab between the read and the write is a refusal,
    // not an unhandled rejection — the same treatment `deleteLane` gives it.
    // Narrowed to that case on purpose: a dropped connection, or code live
    // before CD's `prisma db push` has created CheckInRemoval, is an outage and
    // must not read back to a parent as "there was nothing there".
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { code?: string }).code === "P2025"
    ) {
      return { ok: false, error: "not-found" };
    }
    return { ok: false, error: "write-failed" };
  }

  revalidatePath("/");
  revalidatePath("/amend");
  revalidatePath("/history");
  return { ok: true };
}
