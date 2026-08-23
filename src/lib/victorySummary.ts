export type VictoryInput = {
  laneName: string;
  challenge: string;
  defeats: number;
  levelName: string;
  leveledUp: boolean;
};

export function buildVictorySummaryPrompt(input: VictoryInput): string {
  const { laneName, challenge, defeats, levelName, leveledUp } = input;

  let instruction = `Write 2-3 sentences for a youth coach. The summary should mention that in the ${laneName} lane, the player completed the ${challenge} challenge with ${defeats} defeats, and that they are currently at the ${levelName} rank.`;

  if (leveledUp) {
    instruction += ` Please also instruct the coach to celebrate their promotion to the ${levelName} rank.`;
  }

  instruction += ` The coach should speculate warmly about where this trajectory leads if the player keeps showing up next season. The summary must include the exact phrases "keeps showing up" and "never grades".`;

  return instruction;
}