import { getWeekStart } from "@/lib/weekUtils";

const DAY = 24 * 60 * 60 * 1000;

export interface DemoCheckIn {
  date: Date;
  isRest: boolean;
}

export interface DemoLane {
  id: string;
  name: string;
  emoji: string;
  targetPerWeek: number;
  isActive: boolean;
  sortOrder: number;
  startsOn: Date | null;
  checkIns: DemoCheckIn[];
  bossBattles: {
    id: string;
    weekStarting: Date;
    challenge: string | null;
    rerollCount: number;
    completedAt: Date | null;
    coachNote: string | null;
  }[];
  targetChanges: { target: number; effectiveFrom: Date }[];
  streakFreezes: { usedDate: Date | null }[];
}

export interface DemoSeason {
  lanes: DemoLane[];
  prize: {
    title: string;
    description: string | null;
    reasons: string[];
    photoUrl: string | null;
    seasonStart: Date;
  };
  defeats: number;
}

/**
 * A season for a visitor who has not signed in.
 *
 * Every date is derived from `today` rather than written down, so the demo is
 * always mid-week and never rots: a fixture with fixed dates would show an
 * empty current week the moment the calendar moved past it, which is exactly
 * the "0 / 5 with a dead bar" impression the app works to avoid.
 *
 * The shape matches what the pages' Prisma includes return, so pages swap the
 * source and change nothing else.
 *
 * Composed to show the app working rather than merely populated: a live
 * streak, a broken run with a freeze banked to mend it, a target already met
 * so a boss is waiting, a boss already beaten, and a retired lane proving
 * history is kept.
 */
export function getDemoSeason(today: Date): DemoSeason {
  const thisWeek = getWeekStart(today);
  const lastWeek = new Date(thisWeek.getTime() - 7 * DAY);
  const weekBefore = new Date(thisWeek.getTime() - 14 * DAY);
  const day = (from: Date, offset: number) => new Date(from.getTime() + offset * DAY);

  /** Days of `week` that have already happened, capped at `count`. */
  const soFar = (week: Date, count: number, rest: number[] = []) => {
    const elapsed = Math.min(
      count,
      Math.floor((today.getTime() - week.getTime()) / DAY) + 1
    );
    return Array.from({ length: Math.max(0, elapsed) }, (_, i) => ({
      date: day(week, i),
      isRest: rest.includes(i),
    }));
  };

  const fullWeek = (week: Date, count: number, rest: number[] = []) =>
    Array.from({ length: count }, (_, i) => ({
      date: day(week, i),
      isRest: rest.includes(i),
    }));

  return {
    // Two weeks banked, so the prize grid shows real progress rather than an
    // empty thirteen.
    prize: {
      title: "Three days at Disneyland",
      description:
        "Pixar Pier, the Incredicoaster twice, and churros for breakfast if the season is earned.",
      reasons: [
        "Because a season of showing up deserves a trip, not a trophy",
        "Because he picked it himself, off the fridge, in March",
      ],
      photoUrl: "/demo/disney-ears.jpg",
      seasonStart: weekBefore,
    },
    defeats: 2, // wall ball and jogs; kept in step by the test below
    lanes: [
      {
        // Unbroken run through today: the streak badge is alight.
        id: "demo-wallball",
        name: "wall ball 60sec quickstick",
        emoji: "🥍",
        targetPerWeek: 5,
        isActive: true,
        sortOrder: 0,
        startsOn: null,
        checkIns: [
          ...fullWeek(weekBefore, 5),
          // The whole of last week, Monday to Sunday. Stopping at Saturday
          // would break the streak every Monday, when yesterday is the gap.
          ...fullWeek(lastWeek, 7),
          ...soFar(thisWeek, 7),
        ],
        bossBattles: [
          {
            id: "demo-battle-1",
            weekStarting: lastWeek,
            challenge:
              "Ten minutes against the wall without dropping it twice in a row.",
            rerollCount: 0,
            completedAt: day(lastWeek, 5),
            coachNote:
              "You kept showing up all week and the wall never got the better of you. This coach never grades — but that was a real one.",
          },
        ],
        targetChanges: [],
        streakFreezes: [],
      },
      {
        // Missed yesterday with a freeze banked: the repair offer is on screen.
        id: "demo-sprints",
        name: "50yrd suicide 3 times",
        emoji: "🏃",
        targetPerWeek: 3,
        isActive: true,
        sortOrder: 1,
        startsOn: null,
        checkIns: [
          ...fullWeek(weekBefore, 3),
          // Monday to Saturday, no Sunday. On a Monday the gap IS Sunday, and
          // a freeze is only offered when it reconnects to a run behind it.
          ...fullWeek(lastWeek, 6),
          // Everything up to today except yesterday — the gap a freeze mends.
          ...soFar(thisWeek, 7).filter(
            (c) => c.date.getTime() !== day(today, -1).getTime()
          ),
        ],
        bossBattles: [],
        targetChanges: [],
        streakFreezes: [{ usedDate: null }],
      },
      {
        // Last week's target met with its boss unfought, so the grace week
        // always has a live challenge to show.
        id: "demo-plank",
        name: "60sec plank",
        emoji: "💪",
        targetPerWeek: 3,
        isActive: true,
        sortOrder: 2,
        startsOn: null,
        checkIns: [
          ...fullWeek(weekBefore, 4, [3]),
          // Last week's target met, and its boss never fought — so the grace
          // week keeps a live challenge on screen whatever day it is. Hanging
          // this on THIS week's target would leave the boss hub empty every
          // Monday and Tuesday, when no target can have been met yet.
          ...fullWeek(lastWeek, 5),
          ...soFar(thisWeek, 4),
        ],
        bossBattles: [
          {
            id: "demo-battle-2",
            weekStarting: lastWeek,
            challenge:
              "Hold the plank while someone reads out the whole team sheet. No wobbling on the last name.",
            rerollCount: 0,
            completedAt: null,
            coachNote: null,
          },
        ],
        targetChanges: [],
        streakFreezes: [],
      },
      {
        // Retired mid-season: History keeps what it earned.
        id: "demo-jogs",
        name: "30 min jogs",
        emoji: "⚡",
        targetPerWeek: 3,
        isActive: false,
        sortOrder: 3,
        startsOn: null,
        checkIns: fullWeek(weekBefore, 3),
        bossBattles: [
          {
            id: "demo-battle-3",
            weekStarting: weekBefore,
            challenge: "Jog the long way round the park without stopping.",
            rerollCount: 1,
            completedAt: day(weekBefore, 4),
            coachNote:
              "Three weeks of turning up in the cold. The legs remember that even when the calendar forgets.",
          },
        ],
        targetChanges: [],
        streakFreezes: [],
      },
    ],
  };
}
