import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/tenancy";
import { generate } from "@/lib/llm";
import { revalidatePath } from "next/cache";
import { playerLevel } from "@/lib/playerLevel";
import { buildVictorySummaryPrompt } from "@/lib/victorySummary";
import { awardFreeze } from "@/app/actions/awardFreeze";

export async function completeBossBattle(battleId: string): Promise<{
  ok: true;
  coachNote: string | null;
  defeats: number;
  leveledUp: boolean;
  freezeAwarded: boolean;
  newLevel: number;
  levelName: string;
} | {
  ok: false;
  error: string;
}> {
  const userId = await requireUserId();

  const battle = await prisma.bossBattle.findFirst({
    where: {
      id: battleId,
      lane: {
        userId
      }
    },
    include: {
      lane: true
    }
  });

  if (!battle || battle.completedAt !== null) {
    return { ok: false, error: 'not-found' };
  }

  // 1. Stamp completion
  const nowDate = new Date();
  await prisma.bossBattle.update({
    where: { id: battleId },
    data: {
      completedAt: nowDate
    }
  });

  // 2. Calculate progress
  const defeats = await prisma.bossBattle.count({
    where: {
      completedAt: { not: null },
      lane: { userId }
    }
  });

  const now = playerLevel(defeats);
  const prev = playerLevel(defeats - 1);
  const leveledUp = now.level > prev.level;

  let freezeAwarded = false;
  if (leveledUp) {
    // Through the action rather than a bare create, so minting a token goes
    // through one owner-checked path that also refreshes the dashboard the
    // badge is read from.
    //
    // Guarded for the same reason the coach note is: the boss is already
    // beaten, and losing that to a failed bonus would take back something
    // earned. A token that did not mint is reported as not awarded rather
    // than assumed.
    try {
      const awarded = await awardFreeze(battle.laneId);
      freezeAwarded = awarded.ok;
    } catch {
      freezeAwarded = false;
    }
  }

  const newLevel = now.level;
  const levelName = now.name;

  // 3. Generate coach note
  let coachNote: string | null = null;
  try {
    coachNote = await generate(buildVictorySummaryPrompt({
      laneName: battle.lane.name,
      challenge: battle.challenge ?? 'the weekly challenge',
      defeats,
      levelName: levelName,
      leveledUp
    }));
  } catch (err) {
    // COMPLETING MUST NEVER FAIL BECAUSE THE LLM DID.
    coachNote = null;
  }

  // 4. Save note if generated
  if (coachNote !== null) {
    await prisma.bossBattle.update({
      where: { id: battleId },
      data: { coachNote }
    });
  }

  revalidatePath('/boss-battles');
  revalidatePath('/');

  return {
    ok: true,
    coachNote,
    defeats,
    leveledUp,
    freezeAwarded,
    newLevel,
    levelName
  };
}