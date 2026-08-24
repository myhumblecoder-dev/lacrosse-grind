import { describe, expect, it } from "vitest";
import { getDemoSeason } from "@/lib/demoSeason";
import { getWeekStart } from "@/lib/weekUtils";
import { computeStreak } from "@/lib/streak";
import { findRepairableGap } from "@/lib/repairableGap";
import { countQualifyingHits } from "@/lib/qualifyingWeek";

const DAY = 24 * 60 * 60 * 1000;
const utcDay = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

// Deliberately three different points in the calendar, including a Monday and
// a Sunday, because the whole promise of generated data is that it holds
// wherever "today" happens to land.
const MOMENTS = [
  new Date("2026-08-24T00:00:00.000Z"), // Monday
  new Date("2026-11-12T00:00:00.000Z"), // Thursday
  new Date("2027-03-07T00:00:00.000Z"), // Sunday
];

describe("getDemoSeason", () => {
  it.each(MOMENTS)("is alive in the current week at %s", (today) => {
    const season = getDemoSeason(today);
    const thisWeek = getWeekStart(today);

    const thisWeeksCheckIns = season.lanes.flatMap((l) =>
      l.checkIns.filter((c) => c.date >= thisWeek)
    );

    // A fixture with hardcoded dates would be empty here the moment the
    // calendar moved past it.
    expect(thisWeeksCheckIns.length).toBeGreaterThan(0);
  });

  it.each(MOMENTS)("never invents a day that has not happened yet, at %s", (today) => {
    const season = getDemoSeason(today);

    for (const lane of season.lanes) {
      for (const checkIn of lane.checkIns) {
        expect(checkIn.date.getTime()).toBeLessThanOrEqual(utcDay(today).getTime());
      }
    }
  });

  it.each(MOMENTS)("shows a live streak at %s", (today) => {
    const wallball = getDemoSeason(today).lanes.find((l) => l.id === "demo-wallball")!;

    expect(computeStreak(wallball.checkIns, utcDay(today))).toBeGreaterThan(1);
  });

  it.each(MOMENTS)("offers a freeze to mend a real gap at %s", (today) => {
    const sprints = getDemoSeason(today).lanes.find((l) => l.id === "demo-sprints")!;
    const frozen = sprints.streakFreezes
      .map((f) => f.usedDate)
      .filter((d): d is Date => d !== null);

    expect(sprints.streakFreezes.some((f) => f.usedDate === null)).toBe(true);
    expect(findRepairableGap(sprints.checkIns, utcDay(today), frozen)).not.toBeNull();
  });

  it.each(MOMENTS)("has a boss awake and unfought at %s", (today) => {
    // Hung on LAST week's target, met and unfought, so the grace week keeps a
    // challenge on screen every day. Requiring this week's target would leave
    // the boss hub empty on Mondays and Tuesdays, when no target can yet have
    // been met — a demo that only works Thursday to Sunday.
    const plank = getDemoSeason(today).lanes.find((l) => l.id === "demo-plank")!;
    const lastWeek = new Date(getWeekStart(today).getTime() - 7 * DAY);
    const unfought = plank.bossBattles.find((b) => b.completedAt === null)!;

    expect(unfought.weekStarting.getTime()).toBe(lastWeek.getTime());
    expect(unfought.challenge).not.toBeNull();
    expect(countQualifyingHits(plank.checkIns, lastWeek)).toBeGreaterThanOrEqual(
      plank.targetPerWeek
    );
  });

  it("keeps a retired lane so History can show it", () => {
    const season = getDemoSeason(MOMENTS[0]);
    const retired = season.lanes.filter((l) => !l.isActive);

    expect(retired).toHaveLength(1);
    expect(retired[0].checkIns.length).toBeGreaterThan(0);
  });

  it.each(MOMENTS)("reports exactly the defeats it actually contains, at %s", (today) => {
    // The pages derive rank and pips from this number. If it drifts from the
    // battles, the demo shows a rank it has not earned.
    const season = getDemoSeason(today);
    const beaten = season.lanes.flatMap((l) =>
      l.bossBattles.filter((b) => b.completedAt !== null)
    );

    expect(beaten.length).toBeGreaterThan(0);
    expect(season.defeats).toBe(beaten.length);
  });

  it("started far enough back that the prize grid has earned weeks", () => {
    const today = MOMENTS[0];
    const season = getDemoSeason(today);

    expect(season.prize.seasonStart.getTime()).toBeLessThan(
      getWeekStart(today).getTime()
    );
    expect(season.prize.photoUrl).toBe("/demo/disney-pixar-pier.jpg");
  });

  it("is pure — two calls at the same moment agree", () => {
    const a = getDemoSeason(MOMENTS[1]);
    const b = getDemoSeason(MOMENTS[1]);

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("moves with the calendar rather than standing still", () => {
    const a = getDemoSeason(MOMENTS[0]);
    const b = getDemoSeason(new Date(MOMENTS[0].getTime() + 30 * DAY));

    expect(a.prize.seasonStart.getTime()).not.toBe(b.prize.seasonStart.getTime());
  });
});
