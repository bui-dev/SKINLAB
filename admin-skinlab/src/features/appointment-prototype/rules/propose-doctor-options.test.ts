import { describe, expect, it } from "vitest";

import type { PrototypeAppointment, PrototypeDoctor } from "../model/types";
import { proposeDoctorOptions } from "./propose-doctor-options";

const doctors: PrototypeDoctor[] = [
  {
    id: "doctor-1",
    label: "BS-001",
    availableFrom: "2026-11-10T09:00:00+07:00",
    availableTo: "2026-11-10T19:00:00+07:00",
  },
  {
    id: "doctor-2",
    label: "BS-002",
    availableFrom: "2026-11-10T09:00:00+07:00",
    availableTo: "2026-11-10T19:00:00+07:00",
  },
];

describe("proposeDoctorOptions", () => {
  it("prefers_primary_doctor", () => {
    const proposals = proposeDoctorOptions({
      now: "2026-11-10T09:30:00+07:00",
      estimatedDurationMinutes: 30,
      primaryDoctorId: "doctor-2",
      doctors,
      appointments: [],
    });

    expect(proposals[0]).toEqual({
      kind: "primary",
      doctorId: "doctor-2",
      availableAt: "2026-11-10T09:30:00+07:00",
    });
  });

  it("offers_substitute_without_silent_reassignment", () => {
    const activePrimaryVisit: PrototypeAppointment = {
      id: "appointment-active",
      patientLabel: "BN-001",
      kind: "booked",
      status: "in_progress",
      estimatedDurationMinutes: 60,
      checkedInAt: "2026-11-10T09:00:00+07:00",
      assignedDoctorId: "doctor-1",
    };

    const proposals = proposeDoctorOptions({
      now: "2026-11-10T09:30:00+07:00",
      estimatedDurationMinutes: 30,
      primaryDoctorId: "doctor-1",
      doctors,
      appointments: [activePrimaryVisit],
    });

    expect(proposals).toContainEqual({
      kind: "wait",
      doctorId: "doctor-1",
      availableAt: "2026-11-10T10:00:00+07:00",
    });
    expect(proposals).toContainEqual({
      kind: "substitute",
      doctorId: "doctor-2",
      availableAt: "2026-11-10T09:30:00+07:00",
    });
    expect(
      proposals.some(
        ({ kind, doctorId }) => kind === "primary" && doctorId === "doctor-2",
      ),
    ).toBe(false);
  });
});
