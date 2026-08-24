import { describe, it, expect } from 'vitest'
import { buildWeekRecaps, type RecapLaneInput } from './weekRecap'

describe('weekRecap', () => {
  it('groups check-ins into weeks newest first', () => {
    const week1Start = new Date(Date.UTC(2024, 0, 1)); // Jan 1
    const week2Start = new Date(Date.UTC(2024, 0, 8)); // Jan 8
    
    const input: RecapLaneInput[] = [{
      id: '1', name: 'L1', emoji: '🔥', targetPerWeek: 5, isActive: true, sortOrder: 1,
      checkIns: [
        { date: new Date(Date.UTC(2024, 0, 2)), isRest: false },
        { date: new Date(Date.UTC(2024, 0, 9)), isRest: false }
      ],
      bossBattles: []
    }];

    const result = buildWeekRecaps(input);

    expect(result).toHaveLength(2);
    expect(result[0].weekStart.toISOString()).toBe(week2Start.toISOString());
    expect(result[1].weekStart.toISOString()).toBe(week1Start.toISOString());
  });

  it('a lane with no check-ins that week is absent', () => {
    const input: RecapLaneInput[] = [
      {
        id: '1', name: 'L1', emoji: '🔥', targetPerWeek: 5, isActive: true, sortOrder: 1,
        checkIns: [{ date: new Date(Date.UTC(2024, 0, 1)), isRest: false }],
        bossBattles: []
      },
      {
        id: '2', name: 'L2', emoji: '💧', targetPerWeek: 5, isActive: true, sortOrder: 2,
        checkIns: [],
        bossBattles: []
      }
    ];

    const result = buildWeekRecaps(input);
    expect(result[0].lanes).toHaveLength(1);
    expect(result[0].lanes[0].id).toBe('1');
  });

  it('a retired lane keeps its record', () => {
    const input: RecapLaneInput[] = [{
      id: '1', name: 'L1', emoji: '🔥', targetPerWeek: 5, isActive: false, sortOrder: 1,
      checkIns: [{ date: new Date(Date.UTC(2024, 0, 1)), isRest: false }],
      bossBattles: []
    }];

    const result = buildWeekRecaps(input);
    expect(result[0].lanes[0].isActive).toBe(false);
    expect(result[0].lanes[0].hits).toBe(1);
  });

  it("battleFought marks only the battle's week", () => {
    const week1Start = new Date(Date.UTC(2024, 0, 1));
    const week2Start = new Date(Date.UTC(2024, 0, 8));

    const input: RecapLaneInput[] = [{
      id: '1', name: 'L1', emoji: '🔥', targetPerWeek: 5, isActive: true, sortOrder: 1,
      // the battle's week must have check-ins — a week with none never renders
      checkIns: [
        { date: new Date(Date.UTC(2024, 0, 2)), isRest: false },
        { date: new Date(Date.UTC(2024, 0, 9)), isRest: false }
      ],
      bossBattles: [{ weekStarting: week2Start, completedAt: new Date(Date.UTC(2024, 0, 10)) }]
    }];

    const result = buildWeekRecaps(input);
    
    // Week 2 (Newest first)
    const week2 = result.find(w => w.weekStart.toISOString() === week2Start.toISOString());
    const week1 = result.find(w => w.weekStart.toISOString() === week1Start.toISOString());

    expect(week2?.lanes[0].battleFought).toBe(true);
    expect(week1?.lanes[0].battleFought).toBe(false);
  });

  it('an uncompleted battle does not mark the week', () => {
    const week1Start = new Date(Date.UTC(2024, 0, 1));
    const week2Start = new Date(Date.UTC(2024, 0, 8));

    const input: RecapLaneInput[] = [{
      id: '1', name: 'L1', emoji: '🔥', targetPerWeek: 5, isActive: true, sortOrder: 1,
      checkIns: [
        { date: new Date(Date.UTC(2024, 0, 2)), isRest: false },
        { date: new Date(Date.UTC(2024, 0, 9)), isRest: false }
      ],
      bossBattles: [
        {
          weekStarting: week2Start,
          completedAt: null // Uncompleted
        }
      ]
    }];

    const result = buildWeekRecaps(input);
    const week2 = result.find(w => w.weekStart.toISOString() === week2Start.toISOString());
    
    expect(week2?.lanes[0].battleFought).toBe(false);
  });

  it('hits count rest days and days stay chronological', () => {
    const input: RecapLaneInput[] = [{
      id: '1', name: 'L1', emoji: '🔥', targetPerWeek: 5, isActive: true, sortOrder: 1,
      checkIns: [
        { date: new Date(Date.UTC(2024, 0, 5)), isRest: false },
        { date: new Date(Date.UTC(2024, 0, 2)), isRest: true },
        { date: new Date(Date.UTC(2024, 0, 3)), isRest: false }
      ],
      bossBattles: []
    }];

    const result = buildWeekRecaps(input);
    const laneWeek = result[0].lanes[0];

    expect(laneWeek.hits).toBe(3);
    expect(laneWeek.days).toHaveLength(3);
    // Check chronological order
    expect(laneWeek.days[0].date.getUTCDate()).toBe(2);
    expect(laneWeek.days[1].date.getUTCDate()).toBe(3);
    expect(laneWeek.days[2].date.getUTCDate()).toBe(5);
    // Check rest day property
    expect(laneWeek.days[0].isRest).toBe(true);
    expect(laneWeek.days[1].isRest).toBe(false);
  });
});
describe('buildWeekRecaps — the boss gets its own square', () => {
  const D = (s: string) => new Date(s + 'T00:00:00.000Z')
  const lane = (checkIns: { date: Date; isRest: boolean }[], completedAt: Date | null) => [{
    id: 'l1', name: 'Wall ball', emoji: '🥍', targetPerWeek: 5,
    isActive: true, sortOrder: 0, checkIns,
    bossBattles: completedAt ? [{ weekStarting: D('2026-08-10'), completedAt }] : [],
  }]

  const trainedMonToFri = [
    { date: D('2026-08-10'), isRest: false },
    { date: D('2026-08-11'), isRest: false },
    { date: D('2026-08-12'), isRest: false },
    { date: D('2026-08-13'), isRest: false },
    { date: D('2026-08-14'), isRest: false },
  ]

  it('adds a square for a victory on a day with no check-in', () => {
    // Beaten on the Saturday, a day he did not otherwise train.
    const [week] = buildWeekRecaps(lane(trainedMonToFri, D('2026-08-15')))
    const row = week.lanes[0]

    expect(row.days).toHaveLength(6)
    expect(row.days[5].date).toEqual(D('2026-08-15'))
    expect(row.battleDay).toEqual(D('2026-08-15'))
  })

  it('does not count that square toward the weekly target', () => {
    // Beating a boss is not a training day: the tally stays at what he trained.
    const [week] = buildWeekRecaps(lane(trainedMonToFri, D('2026-08-15')))

    expect(week.lanes[0].hits).toBe(5)
    expect(week.lanes[0].days).toHaveLength(6)
  })

  it('does not double up when the victory lands on a training day', () => {
    const [week] = buildWeekRecaps(lane(trainedMonToFri, D('2026-08-14')))
    const row = week.lanes[0]

    expect(row.days).toHaveLength(5)
    expect(row.days.filter((d) => d.date.getTime() === D('2026-08-14').getTime())).toHaveLength(1)
  })

  it('keeps the square in date order', () => {
    const [week] = buildWeekRecaps(lane(trainedMonToFri, D('2026-08-11')))
    const dates = week.lanes[0].days.map((d) => d.date.getTime())

    expect(dates).toEqual([...dates].sort((a, b) => a - b))
  })

  it('adds no square for a boss beaten in its grace week', () => {
    // A square dated after the row it sits in would misstate when the week
    // ended; the fought label still marks the week.
    const [week] = buildWeekRecaps(lane(trainedMonToFri, D('2026-08-18')))
    const row = week.lanes[0]

    expect(row.days).toHaveLength(5)
    expect(row.battleFought).toBe(true)
  })

  it('adds no square when the boss was never beaten', () => {
    const [week] = buildWeekRecaps(lane(trainedMonToFri, null))

    expect(week.lanes[0].days).toHaveLength(5)
    expect(week.lanes[0].battleDay).toBeNull()
  })
})
