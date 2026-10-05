import { prisma } from "@/lib/db";
import { requireUserId, requirePlayerId } from "@/lib/tenancy";
import { askCoach } from "@/lib/coach";
import { buildChallengePrompt } from "@/lib/bossChallenge";
import { getTrainingDay } from "@/lib/trainingDay";
import { playerLevel } from "@/lib/playerLevel";
import { revalidatePath } from "next/cache";

export async function generateBossChallenge(laneId: string, weekStarting: Date): Promise<{ ok: true; challenge: string } | { ok: false; error: string }> {
  const userId = await requireUserId();
  const playerId = await requirePlayerId(userId);

  const lane = await prisma.lane.findFirst({
    where: { id: laneId, playerId }
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

  // This player's defeats set this player's rank. Scoped to the account, a
  // sibling's victories decided which boss this kid was handed.
  const defeats = await prisma.bossBattle.count({
    where: { completedAt: { not: null }, lane: { playerId } }
  });

  const rank = playerLevel(defeats);

  const answer = await askCoach(
    userId,
    "challenge",
    buildChallengePrompt(lane.name, lane.emoji, rank.name)
  );
  if (!answer.ok) {
    return { ok: false, error: answer.error };
  }
  const challenge = answer.text;

  await prisma.bossBattle.upsert({
    where: { laneId_weekStarting: { laneId, weekStarting } },
    update: { challenge },
    create: { laneId, weekStarting, challenge }
  });

  revalidatePath('/boss-battles');

  return { ok: true, challenge };
}