import { getWeekStart } from "@/lib/weekUtils";
import { effectiveTarget } from "@/lib/effectiveTarget";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RecapLaneInput {
  id: string;
  name: string;
  emoji: string;
  targetPerWeek: number;
  /** Effective-dated target changes; absent means the lane never changed. */
  targetChanges?: { target: number; effectiveFrom: Date }[];
  isActive: boolean;
  sortOrder: number;
  checkIns: { date: Date; isRest: boolean }[];
  bossBattles: { weekStarting: Date; completedAt: Date | null }[];
}

export interface RecapDay {
  date: Date;
  isRest: boolean;
}

export interface RecapLaneWeek {
  id: string;
  name: string;
  emoji: string;
  isActive: boolean;
  hits: number;
  target: number;
  battleFought: boolean;
  /**
   * The day the boss fell, at UTC midnight, or null.
   *
   * Kept separate from `battleFought` because a boss can be beaten in its
   * grace week — the week after the one it belongs to — so a week can be
   * marked as fought without any of ITS days being the day it happened.
   */
  battleDay: Date | null;
  days: RecapDay[];
}

export interface WeekRecap {
  weekStart: Date;
  lanes: RecapLaneWeek[];
}

export function buildWeekRecaps(lanes: RecapLaneInput[]): WeekRecap[] {
  type LaneWeekInternal = Omit<RecapLaneWeek, "target" | "days"> & {
    sortOrder: number;
    hits: number;
    days: RecapDay[];
  };

  const weekMap = new Map<string, { weekStart: Date; laneData: Map<string, LaneWeekInternal> }>();

  // 1. Process all check-ins to identify weeks and populate lane data
  for (const lane of lanes) {
    for (const checkIn of lane.checkIns) {
      const weekStart = getWeekStart(checkIn.date);
      const weekKey = weekStart.toISOString();

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { weekStart, laneData: new Map() });
      }

      const weekEntry = weekMap.get(weekKey)!;
      if (!weekEntry.laneData.has(lane.id)) {
        weekEntry.laneData.set(lane.id, {
          id: lane.id,
          name: lane.name,
          emoji: lane.emoji,
          isActive: lane.isActive,
          hits: 0,
          days: [],
          battleFought: false,
          battleDay: null,
          sortOrder: lane.sortOrder
        });
      }

      const laneWeek = weekEntry.laneData.get(lane.id)!;
      laneWeek.hits += 1;
      laneWeek.days.push({ date: checkIn.date, isRest: checkIn.isRest });
    }
  }

  // 2. Process Boss Battles to mark battles fought in specific weeks
  for (const lane of lanes) {
    for (const battle of lane.bossBattles) {
      if (battle.completedAt) {
        const weekStart = getWeekStart(battle.weekStarting);
        const weekKey = weekStart.toISOString();

        if (weekMap.has(weekKey)) {
          const weekEntry = weekMap.get(weekKey)!;
          if (weekEntry.laneData.has(lane.id)) {
            const laneWeek = weekEntry.laneData.get(lane.id)!;
            laneWeek.battleFought = true;
            const fell = battle.completedAt;
            const fellOn = new Date(
              Date.UTC(fell.getUTCFullYear(), fell.getUTCMonth(), fell.getUTCDate())
            );
            laneWeek.battleDay = fellOn;

            // The boss earns a square of its own. Beating a challenge in the
            // backyard IS showing up, so a victory on a day with no check-in
            // still belongs on the row rather than vanishing behind a label.
            //
            // Only when it falls inside this week: a boss can be beaten in its
            // grace week, and a square dated after the row it sits in would be
            // a lie about when the week ended.
            const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
            const withinWeek = fellOn >= weekStart && fellOn < weekEnd;
            const alreadyADay = laneWeek.days.some(
              (d) => d.date.getTime() === fellOn.getTime()
            );

            // Pushed to `days` but NOT counted in `hits`: the target measures
            // training days, and the victory is not one of them.
            if (withinWeek && !alreadyADay) {
              laneWeek.days.push({ date: fellOn, isRest: false });
            }
          }
        }
      }
    }
  }

  // 3. Transform the map into the final WeekRecap[] structure
  const recaps: WeekRecap[] = Array.from(weekMap.values())
    .map((entry) => {
      const lanesArray = Array.from(entry.laneData.values())
        .map((ld) => ({
          id: ld.id,
          name: ld.name,
          emoji: ld.emoji,
          isActive: ld.isActive,
          hits: ld.hits,
          // History shows each week judged by its own target, not today's.
          target: (() => {
            const source = lanes.find((l) => l.id === ld.id)!;
            return effectiveTarget(
              source.targetChanges,
              entry.weekStart,
              source.targetPerWeek
            );
          })(),
          battleFought: ld.battleFought,
          battleDay: ld.battleDay,
          days: ld.days.sort((a: RecapDay, b: RecapDay) => a.date.getTime() - b.date.getTime())
        }))
        .sort((a, b) => {
          // Sort by isActive (true first) then sortOrder ascending
          // We need to find the original sortOrder from the input lanes
          const aSort = lanes.find(l => l.id === a.id)?.sortOrder ?? 0;
          const bSort = lanes.find(l => l.id === b.id)?.sortOrder ?? 0;
          if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
          return aSort - bSort;
        });

      return {
        weekStart: entry.weekStart,
        lanes: lanesArray
      };
    })
    .sort((a: WeekRecap, b: WeekRecap) => b.weekStart.getTime() - a.weekStart.getTime()); // Newest first

  return recaps;
}