import { prisma } from "@/lib/db";
import { checkInSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { requireUserId, requirePlayerId } from "@/lib/tenancy";
import { isWithinCheckInWindow } from "@/lib/checkInWindow";
import { getTrainingDay } from "@/lib/trainingDay";
import { mayRecord } from "@/lib/checkInAuthorship";

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

  const existing = await prisma.checkIn.findUnique({
    where: { laneId_date: { laneId, date } },
    select: { attestedAt: true, isRest: true },
  });

  const verdict = mayRecord("player", existing, isRest);
  if (!verdict.allowed) {
    return { ok: false, error: verdict.error };
  }

  // A day a witness took OFF the record cannot simply be put back.
  //
  // `mayRecord` can only protect a row that still exists, and a withdrawal
  // deletes it — so without this the protection evaporates at the moment it
  // matters. The windows overlap exactly: `isWithinCheckInWindow` allows today
  // and yesterday, both of which are inside the amend window. A parent withdraws
  // Saturday on Saturday evening; the dashboard re-renders as unchecked; one tap
  // puts it back with no attestation, counting toward the week, and the parent's
  // statement survives only in a table nothing else reads.
  //
  // Putting it back is a witness's call, through `attestCheckIn`. The log stays
  // append-only: once re-attested the row exists again, so the player is refused
  // by the authorship rule instead, and this check only ever fires on a day that
  // currently has nothing on it.
  const withdrawn = await prisma.checkInRemoval.findFirst({
    where: { laneId, date },
    select: { id: true },
  });

  if (withdrawn) {
    return { ok: false, error: "withdrawn" };
  }

  const checkIn = await prisma.checkIn.upsert({
    where: { laneId_date: { laneId, date } },
    update: { isRest, note },
    create: { laneId, date, isRest, note },
  });

  revalidatePath("/");
  return { ok: true, id: checkIn.id };
}