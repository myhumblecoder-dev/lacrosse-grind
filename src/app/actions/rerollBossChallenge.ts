import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/tenancy";
import { generate } from "@/lib/llm";
import { buildChallengePrompt } from "@/lib/bossChallenge";
import { revalidatePath } from "next/cache";
import { playerLevel } from "@/lib/playerLevel";

export async function rerollBossChallenge(battleId: string): Promise<{ ok: true; challenge: string } | { ok: false; error: string }> {
  const userId = await requireUserId();

  const battle = await prisma.bossBattle.findFirst({
    where: { id: battleId, lane: { userId } },
    include: { lane: true },
  });

  if (!battle) {
    return { ok: false, error: 'not-found' };
  }

  if (battle.completedAt !== null) {
    return { ok: false, error: 'already-defeated' };
  }

  const defeats = await prisma.bossBattle.count({
    where: {
      completedAt: { not: null },
      lane: { userId },
    },
  });

  const rank = playerLevel(defeats);
  const allowance = rank.level >= 5 ? 2 : 1;

  if (battle.rerollCount >= allowance) {
    return { ok: false, error: 'already-rerolled' };
  }

  const challenge = await generate(buildChallengePrompt(battle.lane.name, battle.lane.emoji, rank.name));

  await prisma.bossBattle.update({
    where: { id: battleId },
    data: {
      challenge,
      rerollCount: { increment: 1 },
      rerolled: true,
    },
  });

  revalidatePath('/boss-battles');

  return { ok: true, challenge };
}