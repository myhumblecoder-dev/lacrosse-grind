import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/tenancy";
import { generate } from "@/lib/llm";
import { revalidatePath } from "next/cache";

export async function completeBossBattle(battleId: string): Promise<{ ok: true; coachNote: string | null } | { ok: false; error: string }> {
  const userId = await requireUserId();

  const battle = await prisma.bossBattle.findFirst({
    where: {
      id: battleId,
      lane: {
        userId
      }
    }
  });

  if (!battle || battle.completedAt !== null) {
    return { ok: false, error: 'not-found' };
  }

  let coachNote: string | null = null;

  try {
    coachNote = await generate(
      'An effort-focused youth coach writes one hype sentence for a kid who just completed this boss challenge: "' +
        (battle.challenge ?? 'the weekly challenge') +
        '". Celebrate showing up and finishing. No grades, no stats, no advice.'
    );
  } catch (err) {
    // COMPLETING MUST NEVER FAIL BECAUSE THE LLM DID.
    coachNote = null;
  }

  await prisma.bossBattle.update({
    where: { id: battleId },
    data: {
      completedAt: new Date(),
      coachNote
    }
  });

  revalidatePath('/boss-battles');

  return { ok: true, coachNote };
}