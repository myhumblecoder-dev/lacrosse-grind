import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUserId, requirePlayerId } from "@/lib/tenancy";
import { attestCheckInSchema } from "@/lib/validation";
import { verifyWitnessPassphrase } from "@/lib/witnessPassphrase";
import { isWithinAmendWindow } from "@/lib/amendWindow";
import { getTrainingDay } from "@/lib/trainingDay";

/**
 * Put a past day of the current week on the record, as a witness.
 *
 * `attestedAt` is stamped rather than left null: a day attested on Saturday for
 * Tuesday is a different fact from one tapped on Tuesday, and the grid shows the
 * difference. The app does not let a parent's word pass as the player's.
 *
 * The passphrase is checked BEFORE the lane is looked up and before the window,
 * so a wrong guess learns nothing — not whether the lane exists, not which days
 * are in range.
 */
export async function attestCheckIn(
  input: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const playerId = await requirePlayerId(userId);

  const parsed = attestCheckInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const { laneId, date, isRest, note, passphrase } = parsed.data;

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

  // Prize.playerId is unique, so this is the same one-row read the pages do.
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

  // Nothing to attest about a day that already says what the parent is saying.
  //
  // The grid hides "He showed up" on an already-green cell, but `day.state` comes
  // from a snapshot: the kid can tap today between the page render and the
  // click, and the action is callable directly besides. Without this the upsert
  // would stamp `attestedAt` on the player's own row and relabel his tap as a
  // parent's word — the laundering the schema refuses, in the other direction.
  //
  // A deliberate change still goes through: the grid's "Actually a rest day"
  // sends the opposite `isRest`, and re-attesting a row a witness already owns
  // is a witness editing their own statement.
  const existing = await prisma.checkIn.findUnique({
    where: { laneId_date: { laneId, date } },
    select: { attestedAt: true, isRest: true },
  });

  if (existing && existing.attestedAt === null && existing.isRest === isRest) {
    return { ok: false, error: "already-marked" };
  }

  const attestedAt = new Date();

  const checkIn = await prisma.checkIn.upsert({
    where: { laneId_date: { laneId, date } },
    update: { isRest, attestedAt, attestedNote: note ?? null },
    create: { laneId, date, isRest, attestedAt, attestedNote: note ?? null },
  });

  // A freeze spent on this day covered a day he had actually trained, so the
  // token goes back in the bank. He beat a boss for it. updateMany rather than
  // update because no matching row is the normal case and must not throw.
  //
  // Known composition: attest-then-withdraw refunds the token here and
  // `withdrawCheckIn` does not re-spend it, so the pair leaves a spare token and
  // the gap restored. Left as-is deliberately — the alternative is withdrawal
  // silently spending a token a parent never offered, and FreezeOffer will put
  // the choice back in front of the player on the next render anyway.
  await prisma.streakFreeze.updateMany({
    where: { laneId, usedDate: date },
    data: { usedDate: null },
  });

  revalidatePath("/");
  revalidatePath("/amend");
  revalidatePath("/history");
  return { ok: true, id: checkIn.id };
}
