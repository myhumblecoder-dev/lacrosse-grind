import { prisma } from "@/lib/db";
import { bossBattleSchema } from "@/lib/validation";
import { generate } from "@/lib/llm";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/tenancy";
import { getTrainingDay } from "@/lib/trainingDay";
import { coachCapExceeded } from "@/lib/llmCap";

export async function createBossBattle(
  input: unknown
): Promise<{ ok: true; id: string; coachNote: string } | { ok: false; error: string }> {
  const userId = await requireUserId();

  const parsed = bossBattleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const { laneId, weekStarting, selfReport } = parsed.data;

  const lane = await prisma.lane.findFirst({
    where: { id: laneId, userId },
  });

  if (!lane) {
    return { ok: false, error: "not-found" };
  }

  const todayStart = getTrainingDay(new Date());
  const todayCount = await prisma.bossBattle.count({
    where: {
      lane: { userId },
      createdAt: { gte: todayStart },
    },
  });

  if (coachCapExceeded(todayCount, process.env.COACH_DAILY_LIMIT)) {
    return { ok: false, error: "coach-limit" };
  }

  const prompt = `You are an effort-focused lacrosse coach. the player just described his boss battle: "${selfReport}". Write a 2-3 sentence coach note that is process-focused, never mentions performance grades, and encourages consistency. No 'great job' filler.`;
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