export type PlayerLevel = {
  level: number;
  name: string;
  defeats: number;
  nextAt: number | null;
  progress: number;
};

const LADDER: { threshold: number; name: string }[] = [
  { threshold: 0, name: "baby" },
  { threshold: 1, name: "toddler" },
  { threshold: 2, name: "tween" },
  { threshold: 3, name: "squire" },
  { threshold: 5, name: "page" },
  { threshold: 8, name: "knight" },
  { threshold: 13, name: "barbarian" },
  { threshold: 21, name: "warlord" },
  { threshold: 34, name: "legend" },
];

export function playerLevel(defeats: number): PlayerLevel {
  const n = Math.max(0, Math.floor(defeats || 0));

  let currentIdx = 0;
  for (let i = 0; i < LADDER.length; i++) {
    if (LADDER[i].threshold <= n) {
      currentIdx = i;
    } else {
      break;
    }
  }

  const current = LADDER[currentIdx];
  const next = LADDER[currentIdx + 1];

  const nextAt = next ? next.threshold : null;
  let progress = 0;

  if (nextAt !== null) {
    progress = (n - current.threshold) / (next.threshold - current.threshold);
  } else {
    // At the cap (legend), progress is exactly 1
    progress = 1;
  }

  return {
    level: currentIdx,
    name: current.name,
    defeats: n,
    nextAt,
    progress: Math.min(1, progress),
  };
}