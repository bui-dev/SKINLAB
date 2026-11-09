import { describe, expect, it } from "vitest";

import type { PrototypeAppointment } from "../model/types";
import { rankWaitingEntries } from "./rank-waiting-entries";

const scheduledStart = "2026-11-10T09:00:00+07:00";

function createWaitingAppointment(
  overrides: Partial<PrototypeAppointment>,
): PrototypeAppointment {
  return {
    id: "appointment-default",
    patientLabel: "BN-999",
    kind: "walk_in",
    status: "waiting",
    estimatedDurationMinutes: 30,
    checkedInAt: "2026-11-10T09:05:00+07:00",
    ...overrides,
  };
}

describe("rankWaitingEntries", () => {
  it("keeps_priority_at_fourteen_minutes_fifty_nine_seconds", () => {
    const alreadyWaiting = createWaitingAppointment({
      id: "appointment-walk-in",
      checkedInAt: "2026-11-10T09:05:00+07:00",
    });
    const bookedWithinGrace = createWaitingAppointment({
      id: "appointment-booked",
      kind: "booked",
      scheduledStart,
      checkedInAt: "2026-11-10T09:14:59+07:00",
    });

    const ranked = rankWaitingEntries({
      now: "2026-11-10T09:14:59+07:00",
      appointments: [alreadyWaiting, bookedWithinGrace],
    });

    expect(ranked.map(({ id }) => id)).toEqual([
      "appointment-booked",
      "appointment-walk-in",
    ]);
  });

  it("places_already_waiting_patient_before_late_arrival", () => {
    const alreadyWaiting = createWaitingAppointment({
      id: "appointment-walk-in",
      checkedInAt: "2026-11-10T09:05:00+07:00",
    });
    const lateArrival = createWaitingAppointment({
      id: "appointment-late",
      kind: "booked",
      scheduledStart,
      checkedInAt: "2026-11-10T09:15:00+07:00",
    });

    const ranked = rankWaitingEntries({
      now: "2026-11-10T09:15:00+07:00",
      appointments: [lateArrival, alreadyWaiting],
    });

    expect(ranked.map(({ id }) => id)).toEqual([
      "appointment-walk-in",
      "appointment-late",
    ]);
  });

  it("breaks_equal_check_in_times_by_appointment_id", () => {
    const laterId = createWaitingAppointment({ id: "appointment-b" });
    const earlierId = createWaitingAppointment({ id: "appointment-a" });

    const ranked = rankWaitingEntries({
      now: "2026-11-10T09:10:00+07:00",
      appointments: [laterId, earlierId],
    });

    expect(ranked.map(({ id }) => id)).toEqual([
      "appointment-a",
      "appointment-b",
    ]);
  });
});
