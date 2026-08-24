import { prisma } from "@/lib/db";
import { generate } from "@/lib/llm";
import { getTrainingDay } from "@/lib/trainingDay";
import {
  coachBudget,
  DEFAULT_COACH_LIMITS,
  type CoachLimits,
} from "@/lib/coachBudget";

export type CoachKind = "challenge" | "reroll" | "victory";

export type CoachAnswer =
  | { ok: true; text: string }
  | { ok: false; error: "coach-limit" | "coach-failed" };

/** Env first, then the defaults; a nonsense value is ignored rather than obeyed. */
function limitsFromEnv(): CoachLimits {
  const read = (raw: string | undefined, fallback: number) => {
    const n = Number(raw);
    return Number.isInteger(n) && n > 0 ? n : fallback;
  };

  return {
    perUser: read(process.env.COACH_DAILY_LIMIT, DEFAULT_COACH_LIMITS.perUser),
    global: read(
      process.env.COACH_GLOBAL_DAILY_LIMIT,
      DEFAULT_COACH_LIMITS.global
    ),
  };
}

/**
 * The only way to spend money on the coach.
 *
 * Every generation goes through here so the budget cannot be skipped by
 * reaching for `generate` directly — which is exactly how re-rolls and victory
 * notes ended up uncapped while sign-ups were open and the API key was live.
 *
 * The call is recorded before the model is asked. Recording after would
 * undercount every generation that failed midway, which is the moment a
 * runaway caller is most likely to be hammering it.
 */
export async function askCoach(
  userId: string,
  kind: CoachKind,
  prompt: string
): Promise<CoachAnswer> {
  const limits = limitsFromEnv();
  const since = getTrainingDay(new Date());

  const [todayForUser, todayGlobal] = await Promise.all([
    prisma.coachCall.count({ where: { userId, createdAt: { gte: since } } }),
    prisma.coachCall.count({ where: { createdAt: { gte: since } } }),
  ]);

  const budget = coachBudget(todayForUser, todayGlobal, limits);
  if (!budget.allowed) {
    return { ok: false, error: "coach-limit" };
  }

  await prisma.coachCall.create({ data: { userId, kind } });

  try {
    return { ok: true, text: await generate(prompt) };
  } catch {
    return { ok: false, error: "coach-failed" };
  }
}
