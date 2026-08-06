import { prisma as db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function deletePrize(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await db.prize.delete({
      where: { id: "prize" },
    });
    revalidatePath("/prize");
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && (err.message.includes("P2025") || (err as { code?: string }).code === "P2025")) {
      return { ok: false, error: "not-found" };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}