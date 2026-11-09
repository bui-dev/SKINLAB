import { describe, expect, it } from "vitest";

import type { PrototypeAppointment, PrototypeDoctor } from "../model/types";
import { proposeWalkInOptions } from "./propose-walk-in-options";

const doctor: PrototypeDoctor = {
  id: "doctor-1",
  label: "BS-001",
  availableFrom: "2026-11-10T09:00:00+07:00",
  availableTo: "2026-11-10T19:00:00+07:00",
};

const protectedBooking: PrototypeAppointment = {
  id: "appointment-protected",
  patientLabel: "BN-001",
  kind: "booked",
  status: "booked",
  estimatedDurationMinutes: 60,
  scheduledStart: "2026-11-10T10:00:00+07:00",
  assignedDoctorId: "doctor-1",
};

describe("proposeWalkInOptions", () => {
  it("does_not_consume_protected_booked_slot", () => {
    const proposals = proposeWalkInOptions({
      now: "2026-11-10T09:30:00+07:00",
      estimatedDurationMinutes: 30,
      safetyBufferMinutes: 5,
      doctors: [doctor],
      appointments: [protectedBooking],
    });

    expect(proposals.some(({ kind }) => kind === "start_now")).toBe(false);
    expect(proposals).toContainEqual(
      expect.objectContaining({
        kind: "wait_until",
        doctorId: "doctor-1",
        availableAt: "2026-11-10T11:00:00+07:00",
      }),
    );
  });

  it("offers_start_now_only_when_estimated_service_fits", () => {
    const fittingProposals = proposeWalkInOptions({
      now: "2026-11-10T09:00:00+07:00",
      estimatedDurationMinutes: 45,
      safetyBufferMinutes: 10,
      doctors: [doctor],
      appointments: [protectedBooking],
    });
    const overlappingProposals = proposeWalkInOptions({
      now: "2026-11-10T09:00:00+07:00",
      estimatedDurationMinutes: 50,
      safetyBufferMinutes: 15,
      doctors: [doctor],
      appointments: [protectedBooking],
    });

    expect(fittingProposals).toContainEqual(
      expect.objectContaining({
        kind: "start_now",
        doctorId: "doctor-1",
      }),
    );
    expect(overlappingProposals.some(({ kind }) => kind === "start_now")).toBe(
      false,
    );
  });
});
