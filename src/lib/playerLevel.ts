export type PlayerLevel = {
  level: number;
  name: string;
  defeats: number;
  nextAt: number | null;
  /**
   * Fraction through the CURRENT band. Nothing renders this, on purpose: the
   * first three bands are one boss wide, so it is pinned at 0 for every new
   * player. The avatar card draws a pip per evolution instead. Wiring this to
   * a progress bar puts back a bar that cannot fill until raider.
   */
  progress: number;
};

const LADDER: { threshold: number; name: string }[] = [
  { threshold: 0, name: "hatchling" },
  { threshold: 1, name: "whelp" },
  { threshold: 2, name: "shieldbearer" },
  { threshold: 3, name: "raider" },
  { threshold: 5, name: "viking" },
  { threshold: 8, name: "barbarian" },
  { threshold: 13, name: "berserker" },
  { threshold: 21, name: "warlord" },
  { threshold: 34, name: "legend" },
];

/**
 * The rung names in order, for anything that needs to *list* the ladder rather
 * than resolve one rung of it.
 *
 * Exported because the about page used to keep a hand-copied second copy, and
 * a second copy of a list is a list that drifts: it did, and the fix was
 * commit 1d0df11 — the one that had to swap page and squire back into their
 * historical order. Both copies then had to be edited by hand again for the
 * Norse rename. Deriving costs nothing and ends the class of bug.
 */
export const LADDER_NAMES: readonly string[] = LADDER.map((rung) => rung.name);

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