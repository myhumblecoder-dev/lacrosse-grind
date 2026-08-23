import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/tenancy";
import { generate } from "@/lib/llm";
import { buildChallengePrompt } from "@/lib/bossChallenge";
import { coachCapExceeded } from "@/lib/llmCap";
import { getTrainingDay } from "@/lib/trainingDay";
import { playerLevel } from "@/lib/playerLevel";
import { revalidatePath } from "next/cache";

export async function generateBossChallenge(laneId: string, weekStarting: Date): Promise<{ ok: true; challenge: string } | { ok: false; error: string }> {
  const userId = await requireUserId();

  const lane = await prisma.lane.findFirst({
    where: { id: laneId, userId }
  });

  if (!lane) {
    return { ok: false, error: 'not-found' };
  }

  const existing = await prisma.bossBattle.findUnique({
    where: { laneId_weekStarting: { laneId, weekStarting } }
  });

  if (existing?.challenge) {
    return { ok: true, challenge: existing.challenge };
  }

  const defeats = await prisma.bossBattle.count({
    where: { completedAt: { not: null }, lane: { userId } }
  });

  const rank = playerLevel(defeats);

  const todayStart = getTrainingDay(new Date());
  const todayCount = await prisma.bossBattle.count({
    where: {
      lane: { userId },
      createdAt: { gte: todayStart }
    }
  });

  if (coachCapExceeded(todayCount, process.env.COACH_DAILY_LIMIT)) {
    return { ok: false, error: 'coach-limit' };
  }

  const challenge = await generate(buildChallengePrompt(lane.name, lane.emoji, rank.name));

  await prisma.bossBattle.upsert({
    where: { laneId_weekStarting: { laneId, weekStarting } },
    update: { challenge },
    create: { laneId, weekStarting, challenge }
  });

  revalidatePath('/boss-battles');

  return { ok: true, challenge };
}