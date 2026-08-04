import { prisma } from "@/lib/db";
import { bossBattleSchema } from "@/lib/validation";
import { generate } from "@/lib/llm";
import { revalidatePath } from "next/cache";

export async function createBossBattle(
  input: unknown
): Promise<{ ok: true; id: string; coachNote: string } | { ok: false; error: string }> {
  const parsed = bossBattleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const { laneId, weekStarting, selfReport } = parsed.data;
  const prompt = `You are an effort-focused lacrosse coach. Eddie just described his boss battle: "${selfReport}". Write a 2-3 sentence coach note that is process-focused, never mentions performance grades, and encourages consistency. No 'great job' filler.`;
  // If generate() throws, let it propagate — the caller handles it.
  const coachNote = await generate(prompt);

  const battle = await prisma.bossBattle.upsert({
    where: { laneId_weekStarting: { laneId, weekStarting } },
    update: { selfReport, coachNote },
    create: { laneId, weekStarting, selfReport, coachNote },
  });

  revalidatePath("/boss-battles");
  return { ok: true, id: battle.id, coachNote };
}
