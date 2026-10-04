import { getWeekStart } from "@/lib/weekUtils";
import { isWithinAmendWindow } from "@/lib/amendWindow";

const DAY_MS = 86400000;

export type AmendDayState = "session" | "rest" | "withdrawn" | "empty";

export interface AmendDay {
  date: Date;
  state: AmendDayState;
  /** True when a witness put this day on the record, not the player. */
  attested: boolean;
  amendable: boolean;
}

export interface AmendLaneWeek {
  id: string;
  name: string;
  emoji: string;
  days: AmendDay[];
}

export interface AmendLaneInput {
  id: string;
  name: string;
  emoji: string;
  startsOn: Date | null;
  checkIns: { date: Date; isRest: boolean; attestedAt: Date | null }[];
  removals: { date: Date }[];
}

/**
 * This week's cells per lane, Monday through today.
 *
 * `buildWeekRecaps` cannot serve here: it builds its weeks *from* the check-ins,
 * so it emits only days that have one. The empty slots are the whole point of an
 * amendment grid — a day nobody marked is exactly the day a parent is looking
 * for.
 *
 * Never a future day, so the row is three cells long on a Wednesday and seven on
 * a Sunday.
 */
export function buildAmendWeek(
  lanes: AmendLaneInput[],
  today: Date,
  seasonStart: Date | null
): AmendLaneWeek[] {
  const dayKey = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

  const todayKey = dayKey(today);
  const startKey = dayKey(getWeekStart(today));

  const days: Date[] = [];
  for (let t = startKey; t <= todayKey; t += DAY_MS) {
    days.push(new Date(t));
  }

  // Lane order is the caller's; the page sorts, this does not.
  return lanes.map((lane) => ({
    id: lane.id,
    name: lane.name,
    emoji: lane.emoji,
    days: days.map((day) => {
      const key = dayKey(day);
      const checkIn = lane.checkIns.find((c) => dayKey(c.date) === key);
      const withdrawn = lane.removals.some((r) => dayKey(r.date) === key);

      // A live check-in beats a removal: a day withdrawn and then attested
      // again reads as trained, because it is. The removal stays in the log.
      const state: AmendDayState = checkIn
        ? checkIn.isRest
          ? "rest"
          : "session"
        : withdrawn
          ? "withdrawn"
          : "empty";

      return {
        date: day,
        state,
        attested: checkIn?.attestedAt != null,
        amendable: isWithinAmendWindow(day, today, {
          laneStartsOn: lane.startsOn,
          seasonStart,
        }),
      };
    }),
  }));
}
