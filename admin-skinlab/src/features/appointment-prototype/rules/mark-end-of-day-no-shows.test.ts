import { describe, expect, it } from "vitest";

import type { PrototypeAppointment } from "../model/types";
import { markEndOfDayNoShows } from "./mark-end-of-day-no-shows";

function appointment(
  overrides: Partial<PrototypeAppointment>,
): PrototypeAppointment {
  return {
    id: "appointment-default",
    patientLabel: "BN-001",
    kind: "booked",
    status: "booked",
    estimatedDurationMinutes: 30,
    scheduledStart: "2026-11-10T10:00:00+07:00",
    assignedDoctorId: "doctor-1",
    ...overrides,
  };
}

describe("markEndOfDayNoShows", () => {
  it("marks_only_unarrived_bookings_no_show_at_1900", () => {
    const unarrived = appointment({ id: "appointment-unarrived" });
    const checkedIn = appointment({
      id: "appointment-checked-in",
      status: "checked_in",
      checkedInAt: "2026-11-10T10:00:00+07:00",
    });
    const walkIn = appointment({
      id: "appointment-walk-in",
      kind: "walk_in",
      status: "waiting",
      scheduledStart: undefined,
      checkedInAt: "2026-11-10T11:00:00+07:00",
    });

    const result = markEndOfDayNoShows({
      now: "2026-11-10T19:00:00+07:00",
      appointments: [unarrived, checkedIn, walkIn],
    });

    expect(result.map(({ status }) => status)).toEqual([
      "no_show",
      "checked_in",
      "waiting",
    ]);
  });

  it("keeps_cancelled_distinct_from_no_show", () => {
    const cancelled = appointment({
      id: "appointment-cancelled",
      status: "cancelled",
      cancellationReason: "Prototype cancellation",
    });

    const result = markEndOfDayNoShows({
      now: "2026-11-10T19:00:00+07:00",
      appointments: [cancelled],
    });

    expect(result).toEqual([cancelled]);
  });

  it("does_not_close_the_day_before_1900", () => {
    const unarrived = appointment({ id: "appointment-unarrived" });

    const result = markEndOfDayNoShows({
      now: "2026-11-10T18:59:59+07:00",
      appointments: [unarrived],
    });

    expect(result).toEqual([unarrived]);
  });
});
