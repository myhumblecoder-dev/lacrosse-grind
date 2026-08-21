import { getWeekStart } from "@/lib/weekUtils";

export interface RecapLaneInput {
  id: string;
  name: string;
  emoji: string;
  targetPerWeek: number;
  isActive: boolean;
  sortOrder: number;
  checkIns: { date: Date; isRest: boolean }[];
  bossBattles: { weekStarting: Date }[];
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
      const weekStart = getWeekStart(battle.weekStarting);
      const weekKey = weekStart.toISOString();

      if (weekMap.has(weekKey)) {
        const weekEntry = weekMap.get(weekKey)!;
        if (weekEntry.laneData.has(lane.id)) {
          const laneWeek = weekEntry.laneData.get(lane.id)!;
          laneWeek.battleFought = true;
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
          target: lanes.find((l) => l.id === ld.id)!.targetPerWeek,
          battleFought: ld.battleFought,
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