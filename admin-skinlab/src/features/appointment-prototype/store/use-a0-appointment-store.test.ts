import { describe, expect, it } from "vitest";

import { createA0AppointmentStore } from "./use-a0-appointment-store";

describe("A0 appointment store", () => {
  it("moves_a_booked_appointment_through_check_in_service_and_completion", () => {
    const store = createA0AppointmentStore();

    store.getState().checkIn({
      appointmentId: "appointment-001",
      checkedInAt: "2026-11-10T09:29:00+07:00",
    });
    expect(
      store.getState().appointments.find(({ id }) => id === "appointment-001"),
    ).toEqual(
      expect.objectContaining({
        status: "checked_in",
        checkedInAt: "2026-11-10T09:29:00+07:00",
      }),
    );

    store.getState().startService({
      appointmentId: "appointment-001",
      doctorId: "doctor-1",
    });
    expect(
      store.getState().appointments.find(({ id }) => id === "appointment-001"),
    ).toEqual(
      expect.objectContaining({
        status: "in_progress",
        assignedDoctorId: "doctor-1",
      }),
    );

    store.getState().completeService({
      appointmentId: "appointment-001",
      completedAt: "2026-11-10T10:10:00+07:00",
    });
    expect(
      store.getState().appointments.find(({ id }) => id === "appointment-001"),
    ).toEqual(
      expect.objectContaining({
        status: "completed",
        completedAt: "2026-11-10T10:10:00+07:00",
      }),
    );
  });

  it("registers_a_walk_in_directly_in_the_waiting_queue", () => {
    const store = createA0AppointmentStore();

    const appointmentId = store.getState().registerWalkIn({
      patientLabel: "BN-010",
      checkedInAt: "2026-11-10T10:20:00+07:00",
      estimatedDurationMinutes: 30,
    });

    expect(
      store.getState().appointments.find(({ id }) => id === appointmentId),
    ).toEqual(
      expect.objectContaining({
        patientLabel: "BN-010",
        kind: "walk_in",
        status: "waiting",
      }),
    );
  });

  it("keeps_cancellation_distinct_from_no_show", () => {
    const store = createA0AppointmentStore();

    store.getState().cancelAppointment({
      appointmentId: "appointment-003",
      reason: "Prototype cancellation",
    });

    expect(
      store.getState().appointments.find(({ id }) => id === "appointment-003"),
    ).toEqual(
      expect.objectContaining({
        status: "cancelled",
        cancellationReason: "Prototype cancellation",
      }),
    );
  });

  it("rejects_impossible_transitions", () => {
    const store = createA0AppointmentStore();

    expect(() =>
      store.getState().completeService({
        appointmentId: "appointment-001",
        completedAt: "2026-11-10T10:00:00+07:00",
      }),
    ).toThrow("Cannot complete appointment appointment-001 from booked");

    expect(
      store.getState().appointments.find(({ id }) => id === "appointment-001")
        ?.status,
    ).toBe("booked");
  });

  it("reset_fixtures_restores_the_fake_baseline", () => {
    const store = createA0AppointmentStore();
    const initialAppointments = store.getState().appointments;

    store.getState().advanceClock("2026-11-10T18:00:00+07:00");
    store.getState().registerWalkIn({
      patientLabel: "BN-010",
      checkedInAt: "2026-11-10T18:00:00+07:00",
      estimatedDurationMinutes: 20,
    });
    store.getState().resetFixtures();

    expect(store.getState().now).toBe("2026-11-10T09:00:00+07:00");
    expect(store.getState().appointments).toEqual(initialAppointments);
    expect(store.getState().appointments).not.toBe(initialAppointments);
  });

  it("approves_leave_and_preserves_affected_appointments_for_rescheduling", () => {
    const store = createA0AppointmentStore();

    store.getState().approveLeave({
      leave: {
        id: "leave-001",
        doctorId: "doctor-1",
        startsAt: "2026-11-10T09:00:00+07:00",
        endsAt: "2026-11-10T10:30:00+07:00",
        status: "approved",
      },
    });

    expect(store.getState().leaves).toHaveLength(1);
    expect(
      store.getState().appointments.find(({ id }) => id === "appointment-001"),
    ).toEqual(
      expect.objectContaining({
        status: "needs_reschedule",
        scheduledStart: "2026-11-10T09:30:00+07:00",
        assignedDoctorId: "doctor-1",
      }),
    );
  });

  it("closes_the_day_without_marking_arrived_bookings_no_show", () => {
    const store = createA0AppointmentStore();
    store.getState().checkIn({
      appointmentId: "appointment-001",
      checkedInAt: "2026-11-10T09:20:00+07:00",
    });

    store.getState().closeBusinessDay({ now: "2026-11-10T19:00:00+07:00" });

    expect(store.getState().now).toBe("2026-11-10T19:00:00+07:00");
    expect(
      store.getState().appointments.find(({ id }) => id === "appointment-001")
        ?.status,
    ).toBe("checked_in");
    expect(
      store.getState().appointments.find(({ id }) => id === "appointment-003")
        ?.status,
    ).toBe("no_show");
  });
});
