import { describe, expect, it } from "vitest";

import { classifyArrival } from "./classify-arrival";

const scheduledStart = "2026-11-10T09:00:00+07:00";

describe("classifyArrival", () => {
  it("classifies_an_exact_arrival_as_on_time", () => {
    expect(
      classifyArrival({
        scheduledStart,
        checkedInAt: "2026-11-10T09:00:00+07:00",
        graceMinutes: 15,
      }),
    ).toBe("on_time");
  });

  it("releases_priority_at_exactly_fifteen_minutes", () => {
    expect(
      classifyArrival({
        scheduledStart,
        checkedInAt: "2026-11-10T09:15:00+07:00",
        graceMinutes: 15,
      }),
    ).toBe("late");
  });

  it("marks_late_after_fifteen_minutes", () => {
    expect(
      classifyArrival({
        scheduledStart,
        checkedInAt: "2026-11-10T09:15:01+07:00",
        graceMinutes: 15,
      }),
    ).toBe("late");
  });
});
