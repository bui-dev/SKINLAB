import { describe, expect, it } from "vitest";

import { getSessionPolicy, getSessionUsableUntil } from "./session-policy";

describe("session policy", () => {
  it("uses a thirty-minute idle timeout and eight-hour absolute lifetime at the clinic", () => {
    expect(getSessionPolicy("doctor", "clinic")).toEqual({
      idleMilliseconds: 30 * 60_000,
      absoluteMilliseconds: 8 * 60 * 60_000,
    });
  });

  it("uses a stricter remote-admin policy", () => {
    expect(getSessionPolicy("admin", "remote")).toEqual({
      idleMilliseconds: 15 * 60_000,
      absoluteMilliseconds: 4 * 60 * 60_000,
    });
  });

  it("returns the earlier idle or absolute deadline", () => {
    expect(
      getSessionUsableUntil(
        new Date("2026-11-10T09:00:00.000Z"),
        new Date("2026-11-10T12:00:00.000Z"),
        getSessionPolicy("admin", "remote"),
      ),
    ).toEqual(new Date("2026-11-10T09:15:00.000Z"));
  });
});
