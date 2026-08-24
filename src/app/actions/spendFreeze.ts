import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/tenancy";
import { getTrainingDay } from "@/lib/trainingDay";
import { findRepairableGap } from "@/lib/repairableGap";

/**
 * Spend a banked freeze on a missed day, bridging a broken streak.
 *
 * The server decides which day is spendable rather than trusting the one the
 * page offered: the button is rendered from a snapshot that may be minutes
 * old, and a token costs a boss battle to earn. `findRepairableGap` is the
 * same kernel the dashboard renders from, so the two can never disagree about
 * what a freeze is for.
 */
export async function spendFreeze(
  laneId: string,
  date: Date
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();

  const lane = await prisma.lane.findFirst({
    where: { id: laneId, userId },
    include: {
      checkIns: { select: { date: true, isRest: true } },
      streakFreezes: { where: { usedDate: { not: null } }, select: { usedDate: true } },
    },
  });

  if (!lane) {
    return { ok: false, error: "not-found" };
  }

  const frozenDates = lane.streakFreezes.map((f) => f.usedDate as Date);
  const gap = findRepairableGap(
    lane.checkIns,
    getTrainingDay(new Date()),
    frozenDates
  );

  if (gap === null) {
    return { ok: false, error: "nothing-to-repair" };
  }

  // Compared as calendar days: the caller passes a day, not an instant.
  const asked = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  if (asked !== gap.getTime()) {
    return { ok: false, error: "not-repairable" };
  }

  const freeze = await prisma.streakFreeze.findFirst({
    where: { laneId, usedDate: null, lane: { userId } },
  });

  if (!freeze) {
    return { ok: false, error: "no-freeze-available" };
  }

  await prisma.streakFreeze.update({
    where: { id: freeze.id },
    data: { usedDate: gap },
  });

  revalidatePath("/");
  return { ok: true };
}
