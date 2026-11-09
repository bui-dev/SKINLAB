import type { A0FixtureSet } from "./types";

const PROTOTYPE_DATE = "2026-11-10";

export function createA0Fixtures(): A0FixtureSet {
  return {
    clinicHours: {
      opensAt: "09:00",
      closesAt: "19:00",
    },
    doctors: [
      {
        id: "doctor-1",
        label: "BS-001",
        availableFrom: `${PROTOTYPE_DATE}T09:00:00+07:00`,
        availableTo: `${PROTOTYPE_DATE}T19:00:00+07:00`,
      },
      {
        id: "doctor-2",
        label: "BS-002",
        availableFrom: `${PROTOTYPE_DATE}T09:00:00+07:00`,
        availableTo: `${PROTOTYPE_DATE}T19:00:00+07:00`,
      },
    ],
    appointments: [
      {
        id: "appointment-001",
        patientLabel: "BN-001",
        kind: "booked",
        status: "booked",
        estimatedDurationMinutes: 45,
        scheduledStart: `${PROTOTYPE_DATE}T09:30:00+07:00`,
        requestedDoctorId: "doctor-1",
        primaryDoctorId: "doctor-1",
        assignedDoctorId: "doctor-1",
      },
      {
        id: "appointment-002",
        patientLabel: "BN-002",
        kind: "walk_in",
        status: "waiting",
        estimatedDurationMinutes: 30,
        checkedInAt: `${PROTOTYPE_DATE}T10:05:00+07:00`,
      },
      {
        id: "appointment-003",
        patientLabel: "BN-003",
        kind: "booked",
        status: "booked",
        estimatedDurationMinutes: 60,
        scheduledStart: `${PROTOTYPE_DATE}T11:00:00+07:00`,
        primaryDoctorId: "doctor-2",
        assignedDoctorId: "doctor-2",
      },
    ],
    leaves: [],
  };
}
