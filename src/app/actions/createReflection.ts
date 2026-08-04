import { prisma } from "@/lib/db";
import { reflectionSchema } from "@/lib/validation";
import { generate } from "@/lib/llm";
import { revalidatePath } from "next/cache";

export async function createReflection(
  input: unknown
): Promise<{ ok: true; id: string; coachSummary: string } | { ok: false; error: string }> {
  const parsed = reflectionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }

  const { weekStarting, playerNote } = parsed.data;
  const prompt = `You are an effort-focused coach. Summarize Eddie's weekly reflection in 2-3 encouraging, process-framed sentences — never grades, never 'great job' filler: "${playerNote}".`;
  // If generate() throws, let it propagate — the caller handles it.
  const coachSummary = await generate(prompt);

  const reflection = await prisma.weeklyReflection.upsert({
    where: { weekStarting },
    update: { playerNote, coachSummary },
    create: { weekStarting, playerNote, coachSummary },
  });

  revalidatePath("/reflection");
  return { ok: true, id: reflection.id, coachSummary };
}
