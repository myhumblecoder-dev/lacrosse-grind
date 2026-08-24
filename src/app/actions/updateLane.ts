import { prisma as db } from "@/lib/db";
import { laneSchema } from "@/lib/validation";
import { requireUserId } from "@/lib/tenancy";
import { revalidatePath } from "next/cache";
import { resolveSeasonStart } from "@/lib/seasonAnchor";
import { getTrainingDay } from "@/lib/trainingDay";
import { effectiveTarget } from "@/lib/effectiveTarget";

/**
 * Updates a lane with a partial patch.
 * Validates the patch using laneSchema.partial().
 *
 * Name and emoji apply at once — they carry no score. A new weekly target does
 * not: it is scheduled for the Monday on or after today, so the week in
 * progress is judged by the target it was started under and finished weeks can
 * never be re-scored by a later edit.
 */
export async function updateLane(id: string, patch: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await requireUserId();
  try {
    // Validate the patch using the partial schema
    const parsed = laneSchema.partial().safeParse(patch);

    if (!parsed.success) {
      return { ok: false, error: "validation" };
    }

    const { targetPerWeek, ...immediate } = parsed.data;

    // Ownership is proved by the read, not by an update's row count: a
    // target-only edit has nothing to write to the row, and `updateMany` with
    // an empty `data` reports count 0 even for a row that exists and is owned
    // — which would read as "not-found" and drop the edit on the floor.
    const lane = await db.lane.findFirst({
      where: { id, userId },
      include: { targetChanges: true },
    });
    if (!lane) {
      return { ok: false, error: "not-found" };
    }

    if (Object.keys(immediate).length > 0) {
      await db.lane.updateMany({ where: { id, userId }, data: immediate });
    }

    if (targetPerWeek !== undefined) {
      const effectiveFrom = resolveSeasonStart(getTrainingDay(new Date()));

      // Saving the edit form resubmits the target even when only the name
      // changed, so only schedule a row when the number actually moves.
      const alreadyScheduled = effectiveTarget(
        lane.targetChanges,
        effectiveFrom,
        lane.targetPerWeek
      );

      if (alreadyScheduled !== targetPerWeek) {
        await db.laneTarget.upsert({
          where: { laneId_effectiveFrom: { laneId: id, effectiveFrom } },
          update: { target: targetPerWeek },
          create: { laneId: id, target: targetPerWeek, effectiveFrom },
        });
      }
    }

    revalidatePath("/lanes");
    // A renamed lane or a rescheduled target changes what Today and the boss
    // hub render, so neither may keep a cached copy.
    revalidatePath("/");
    revalidatePath("/boss-battles");

    return { ok: true };
  } catch (err) {
    // If it's a database error or other error, we let it propagate or handle it
    // The AC specifies returning error: 'validation' for Zod failure.
    // For other errors (like Prisma throwing), we re-throw to satisfy the test requirement
    // that db errors propagate as thrown errors.
    throw err;
  }
}