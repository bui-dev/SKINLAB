import { describe, expect, it } from "vitest";

import type { PrototypeAppointment, PrototypeLeave } from "../model/types";
import { applyApprovedLeave } from "./apply-doctor-leave";

const leave: PrototypeLeave = {
  id: "leave-001",
  doctorId: "doctor-1",
  startsAt: "2026-11-10T09:00:00+07:00",
  endsAt: "2026-11-10T12:00:00+07:00",
  status: "approved",
};

function bookedAppointment(
  overrides: Partial<PrototypeAppointment>,
): PrototypeAppointment {
  return {
    id: "appointment-default",
    patientLabel: "BN-001",
    kind: "booked",
    status: "booked",
    estimatedDurationMinutes: 45,
    scheduledStart: "2026-11-10T09:30:00+07:00",
    assignedDoctorId: "doctor-1",
    ...overrides,
  };
}

describe("applyApprovedLeave", () => {
  it("marks_overlapping_appointments_for_rescheduling_without_deletion", () => {
    const overlapping = bookedAppointment({ id: "appointment-overlap" });

    const result = applyApprovedLeave({
      leave,
      appointments: [overlapping],
    });

    expect(result.reschedulingAppointmentIds).toEqual(["appointment-overlap"]);
    expect(result.appointments).toHaveLength(1);
    expect(result.appointments[0]).toEqual({
      ...overlapping,
      status: "needs_reschedule",
    });
    expect(overlapping.status).toBe("booked");
  });

  it("does_not_change_non_overlapping_appointments", () => {
    const laterAppointment = bookedAppointment({
      id: "appointment-later",
      scheduledStart: "2026-11-10T13:00:00+07:00",
    });
    const otherDoctorAppointment = bookedAppointment({
      id: "appointment-other-doctor",
      assignedDoctorId: "doctor-2",
    });

    const result = applyApprovedLeave({
      leave,
      appointments: [laterAppointment, otherDoctorAppointment],
    });

    expect(result.reschedulingAppointmentIds).toEqual([]);
    expect(result.appointments).toEqual([
      laterAppointment,
      otherDoctorAppointment,
    ]);
  });
});
