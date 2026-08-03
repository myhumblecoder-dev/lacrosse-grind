import { prisma as db } from "@/lib/db";
import { laneSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";

/**
 * Updates a lane with a partial patch.
 * Validates the patch using laneSchema.partial().
 */
export async function updateLane(id: string, patch: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // Validate the patch using the partial schema
    const parsed = laneSchema.partial().safeParse(patch);

    if (!parsed.success) {
      return { ok: false, error: "validation" };
    }

    // Perform the update in the database
    await db.lane.update({
      where: { id },
      data: parsed.data,
    });

    // Revalidate the lanes path to ensure the UI reflects the change
    revalidatePath("/lanes");

    return { ok: true };
  } catch (err) {
    // If it's a database error or other error, we let it propagate or handle it
    // The AC specifies returning error: 'validation' for Zod failure.
    // For other errors (like Prisma throwing), we re-throw to satisfy the test requirement
    // that db errors propagate as thrown errors.
    throw err;
  }
}