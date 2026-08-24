import { describe, expect, it } from "vitest";
import { isWithinCheckInWindow } from "@/lib/checkInWindow";

const day = (iso: string) => new Date(iso + "T00:00:00.000Z");
const TODAY = day("2026-08-24");

describe("isWithinCheckInWindow", () => {
  it("allows today", () => {
    expect(isWithinCheckInWindow(TODAY, TODAY)).toBe(true);
  });

  it("allows yesterday, for the rollover and the forgotten tap", () => {
    // The training day rolls at 3am, so a page opened last night and submitted
    // after the rollover is recording a session that really happened.
    expect(isWithinCheckInWindow(day("2026-08-23"), TODAY)).toBe(true);
  });

  it("refuses the day before that", () => {
    expect(isWithinCheckInWindow(day("2026-08-22"), TODAY)).toBe(false);
  });

  it("refuses a day that has not happened", () => {
    // History takes its weeks from the check-ins themselves, so a check-in
    // dated in the future puts a phantom week on the page.
    expect(isWithinCheckInWindow(day("2026-08-25"), TODAY)).toBe(false);
    expect(isWithinCheckInWindow(day("2099-01-01"), TODAY)).toBe(false);
  });

  it("refuses a season fabricated by back-dating", () => {
    // The whole point: without this, a season can be manufactured wholesale.
    for (const d of ["2026-08-01", "2026-06-15", "1970-01-01"]) {
      expect(isWithinCheckInWindow(day(d), TODAY), d).toBe(false);
    }
  });

  it("judges by calendar day, not by the clock", () => {
    // A check-in at 11pm and a "today" at 6am are the same day.
    expect(
      isWithinCheckInWindow(new Date("2026-08-24T23:15:00.000Z"), TODAY)
    ).toBe(true);
  });

  it("holds across a month boundary", () => {
    const firstOfSeptember = day("2026-09-01");

    expect(isWithinCheckInWindow(day("2026-08-31"), firstOfSeptember)).toBe(true);
    expect(isWithinCheckInWindow(day("2026-08-30"), firstOfSeptember)).toBe(false);
  });
});
