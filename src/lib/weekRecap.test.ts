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
      bossBattles: [{ weekStarting: week2Start }]
    }];

    const result = buildWeekRecaps(input);
    
    // Week 2 (Newest first)
    const week2 = result.find(w => w.weekStart.toISOString() === week2Start.toISOString());
    const week1 = result.find(w => w.weekStart.toISOString() === week1Start.toISOString());

    expect(week2?.lanes[0].battleFought).toBe(true);
    expect(week1?.lanes[0].battleFought).toBe(false);
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