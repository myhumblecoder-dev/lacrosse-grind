import { prisma } from "@/lib/db";
import { reflectionSchema } from "@/lib/validation";
import { generate } from "@/lib/llm";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/tenancy";
import { getTrainingDay } from "@/lib/trainingDay";
import { coachCapExceeded } from "@/lib/llmCap";

export async function createReflection(
  input: unknown
): Promise<{ ok: true; id: string; coachSummary: string } | { ok: false; error: string }> {
  const userId = await requireUserId();

  const parsed = reflectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const { weekStarting, playerNote } = parsed.data;

  const todayStart = getTrainingDay(new Date());
  const todayCount = await prisma.weeklyReflection.count({
    where: { userId, createdAt: { gte: todayStart } },
  });

  if (coachCapExceeded(todayCount, process.env.COACH_DAILY_LIMIT)) {
    return { ok: false, error: "coach-limit" };
  }

  const prompt = `You are an effort-focused coach. Summarize the player's weekly reflection in 2-3 encouraging, process-framed sentences — never grades, never 'great job' filler: "${playerNote}".`;
  // If generate() throws, let it propagate — the caller handles it.
  const coachSummary = await generate(prompt);

  const reflection = await prisma.weeklyReflection.upsert({
    where: { userId_weekStarting: { userId, weekStarting } },
    update: { playerNote, coachSummary },
    create: { userId, weekStarting, playerNote, coachSummary },
  });

  revalidatePath("/reflection");
  return { ok: true, id: reflection.id, coachSummary };
}
