export function buildChallengePrompt(laneName: string, emoji: string, rankName?: string): string {
  let prompt = `You are an effort-focused youth coach. Your task is to invent ONE real-world boss challenge derived from the lane: ${laneName} ${emoji}.\n\nRules:\n1. The challenge must be related to the lane's exercise but provide a fresh twist.\n2. Use the same effort scale as the lane.\n3. The challenge must be completable by showing up (NEVER use framing like faster, heavier, or better-than-last-time).\n4. The challenge must be age-appropriate for a kid.\n5. The challenge must need no equipment beyond what the lane itself implies.\n6. Answer in 1-2 sentences with no preamble.`;

  if (rankName) {
    prompt += `\n\nThe challenge is worthy of a ${rankName}. Scale the challenge's epic FLAVOR (wording, not difficulty) to that rank.`;
  }

  return prompt;
}