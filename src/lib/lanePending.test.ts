import { describe, expect, it } from "vitest";
import { isLanePending } from "@/lib/lanePending";

const monday = new Date("2026-08-17T00:00:00.000Z");
const nextMonday = new Date("2026-08-24T00:00:00.000Z");

describe("isLanePending", () => {
  it("treats a lane with no stamp as already started", () => {
    expect(isLanePending(null, monday)).toBe(false);
  });

  it("treats an unselected stamp as already started", () => {
    expect(isLanePending(undefined, monday)).toBe(false);
  });

  it("is pending when it starts after this week", () => {
    expect(isLanePending(nextMonday, monday)).toBe(true);
  });

  it("has started once the week it starts on has arrived", () => {
    expect(isLanePending(monday, monday)).toBe(false);
  });

  it("has started for any week after the one it began in", () => {
    expect(isLanePending(monday, nextMonday)).toBe(false);
  });
});
