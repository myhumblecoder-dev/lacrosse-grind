import { describe, expect, it } from "vitest";
import { effectiveTarget } from "@/lib/effectiveTarget";

const week = (iso: string) => new Date(iso + "T00:00:00.000Z");

const AUG_10 = week("2026-08-10");
const AUG_17 = week("2026-08-17");
const AUG_24 = week("2026-08-24");
const AUG_31 = week("2026-08-31");

describe("effectiveTarget", () => {
  it("falls back to the lane's original target when nothing is scheduled", () => {
    expect(effectiveTarget([], AUG_17, 5)).toBe(5);
    expect(effectiveTarget(undefined, AUG_17, 5)).toBe(5);
  });

  it("ignores a change that has not taken effect yet", () => {
    const changes = [{ target: 3, effectiveFrom: AUG_24 }];
    expect(effectiveTarget(changes, AUG_17, 5)).toBe(5);
  });

  it("applies a change from the week it takes effect", () => {
    const changes = [{ target: 3, effectiveFrom: AUG_24 }];
    expect(effectiveTarget(changes, AUG_24, 5)).toBe(3);
    expect(effectiveTarget(changes, AUG_31, 5)).toBe(3);
  });

  it("picks the latest change at or before the week, whatever the order", () => {
    const changes = [
      { target: 7, effectiveFrom: AUG_31 },
      { target: 3, effectiveFrom: AUG_17 },
      { target: 4, effectiveFrom: AUG_24 },
    ];

    expect(effectiveTarget(changes, AUG_10, 5)).toBe(5);
    expect(effectiveTarget(changes, AUG_17, 5)).toBe(3);
    expect(effectiveTarget(changes, AUG_24, 5)).toBe(4);
    expect(effectiveTarget(changes, AUG_31, 5)).toBe(7);
  });

  it("keeps a finished week's verdict fixed when a later change lands", () => {
    // The whole point: raising the target next week must not re-score the
    // week Eddie already earned at the old one.
    const before = effectiveTarget([], AUG_17, 3);
    const after = effectiveTarget([{ target: 5, effectiveFrom: AUG_24 }], AUG_17, 3);

    expect(before).toBe(3);
    expect(after).toBe(3);
  });
});
