import { prisma } from "@/lib/db";
import { laneSchema } from "@/lib/validation";
import { revalidatePath } from "next/cache";

export async function createLane(
  input: unknown
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = laneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const lane = await prisma.lane.create({
    data: { ...parsed.data, sortOrder: 0 },
  });

  revalidatePath("/lanes");
  return { ok: true, id: lane.id };
}
