import { prisma } from "@/lib/db";
import { laneSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/tenancy";
import { resolveSeasonStart } from "@/lib/seasonAnchor";
import { getTrainingDay } from "@/lib/trainingDay";
import { MAX_LANES_PER_USER } from "@/lib/season";

export async function createLane(
  input: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const parsed = laneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const owned = await prisma.lane.count({ where: { userId } });
  if (owned >= MAX_LANES_PER_USER) {
    return { ok: false, error: "too-many-lanes" };
  }

  // A new lane begins on the Monday on or after today, so it always gets a
  // whole week to hit its target rather than being scored against the days
  // that happen to be left.
  const startsOn = resolveSeasonStart(getTrainingDay(new Date()));

  const lane = await prisma.lane.create({
    data: { ...parsed.data, sortOrder: 0, userId, startsOn },
  });

  revalidatePath("/lanes");
  // Today lists the active lanes, so it goes stale the moment one is added.
  revalidatePath("/");
  return { ok: true, id: lane.id };
}