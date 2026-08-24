import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/tenancy";
import { askCoach } from "@/lib/coach";
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

  const answer = await askCoach(
    userId,
    "reroll",
    buildChallengePrompt(battle.lane.name, battle.lane.emoji, rank.name)
  );
  if (!answer.ok) {
    return { ok: false, error: answer.error };
  }
  const challenge = answer.text;

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