"use client";

import { create } from "zustand";
import { createStore } from "zustand/vanilla";

import { createA0Fixtures } from "../model/fixtures";
import type {
  AppointmentStatus,
  DoctorId,
  PrototypeAppointment,
  PrototypeLeave,
} from "../model/types";
import { applyApprovedLeave } from "../rules/apply-doctor-leave";
import { markEndOfDayNoShows } from "../rules/mark-end-of-day-no-shows";

export interface CreateBookedAppointmentInput {
  patientLabel: string;
  scheduledStart: string;
  estimatedDurationMinutes: number;
  requestedDoctorId?: DoctorId;
  primaryDoctorId?: DoctorId;
}

export interface RegisterWalkInInput {
  patientLabel: string;
  checkedInAt: string;
  estimatedDurationMinutes: number;
  requestedDoctorId?: DoctorId;
  primaryDoctorId?: DoctorId;
}

export interface A0AppointmentStore {
  now: string;
  appointments: PrototypeAppointment[];
  leaves: PrototypeLeave[];
  createBookedAppointment(input: CreateBookedAppointmentInput): string;
  registerWalkIn(input: RegisterWalkInInput): string;
  checkIn(input: { appointmentId: string; checkedInAt: string }): void;
  startService(input: { appointmentId: string; doctorId: DoctorId }): void;
  completeService(input: { appointmentId: string; completedAt: string }): void;
  cancelAppointment(input: { appointmentId: string; reason: string }): void;
  approveLeave(input: { leave: PrototypeLeave }): void;
  closeBusinessDay(input: { now: string }): void;
  advanceClock(now: string): void;
  resetFixtures(): void;
}

const INITIAL_NOW = "2026-11-10T09:00:00+07:00";

function nextAppointmentId(appointments: PrototypeAppointment[]) {
  return `appointment-a0-${String(appointments.length + 1).padStart(3, "0")}`;
}

function replaceAppointment(
  appointments: PrototypeAppointment[],
  appointmentId: string,
  allowedStatuses: AppointmentStatus[],
  transitionName: string,
  update: (appointment: PrototypeAppointment) => PrototypeAppointment,
) {
  const appointment = appointments.find(({ id }) => id === appointmentId);

  if (!appointment) {
    throw new Error(`Appointment ${appointmentId} does not exist`);
  }

  if (!allowedStatuses.includes(appointment.status)) {
    throw new Error(
      `Cannot ${transitionName} appointment ${appointmentId} from ${appointment.status}`,
    );
  }

  return appointments.map((candidate) =>
    candidate.id === appointmentId ? update(candidate) : candidate,
  );
}

function createInitialState() {
  const fixtures = createA0Fixtures();

  return {
    now: INITIAL_NOW,
    appointments: fixtures.appointments,
    leaves: fixtures.leaves,
  };
}

function createState(
  set: (
    update:
      | Partial<A0AppointmentStore>
      | ((state: A0AppointmentStore) => Partial<A0AppointmentStore>),
  ) => void,
): A0AppointmentStore {
  return {
    ...createInitialState(),
    createBookedAppointment: (input) => {
      let appointmentId = "";

      set((state) => {
        appointmentId = nextAppointmentId(state.appointments);
        const assignedDoctorId =
          input.requestedDoctorId ?? input.primaryDoctorId;

        return {
          appointments: [
            ...state.appointments,
            {
              id: appointmentId,
              patientLabel: input.patientLabel,
              kind: "booked",
              status: "booked",
              scheduledStart: input.scheduledStart,
              estimatedDurationMinutes: input.estimatedDurationMinutes,
              requestedDoctorId: input.requestedDoctorId,
              primaryDoctorId: input.primaryDoctorId,
              assignedDoctorId,
            },
          ],
        };
      });

      return appointmentId;
    },
    registerWalkIn: (input) => {
      let appointmentId = "";

      set((state) => {
        appointmentId = nextAppointmentId(state.appointments);

        return {
          appointments: [
            ...state.appointments,
            {
              id: appointmentId,
              patientLabel: input.patientLabel,
              kind: "walk_in",
              status: "waiting",
              checkedInAt: input.checkedInAt,
              estimatedDurationMinutes: input.estimatedDurationMinutes,
              requestedDoctorId: input.requestedDoctorId,
              primaryDoctorId: input.primaryDoctorId,
            },
          ],
        };
      });

      return appointmentId;
    },
    checkIn: ({ appointmentId, checkedInAt }) => {
      set((state) => ({
        appointments: replaceAppointment(
          state.appointments,
          appointmentId,
          ["booked"],
          "check in",
          (appointment) => ({
            ...appointment,
            status: "checked_in",
            checkedInAt,
          }),
        ),
      }));
    },
    startService: ({ appointmentId, doctorId }) => {
      set((state) => ({
        appointments: replaceAppointment(
          state.appointments,
          appointmentId,
          ["checked_in", "waiting"],
          "start",
          (appointment) => ({
            ...appointment,
            status: "in_progress",
            assignedDoctorId: doctorId,
            startedAt: state.now,
          }),
        ),
      }));
    },
    completeService: ({ appointmentId, completedAt }) => {
      set((state) => ({
        appointments: replaceAppointment(
          state.appointments,
          appointmentId,
          ["in_progress"],
          "complete",
          (appointment) => ({
            ...appointment,
            status: "completed",
            completedAt,
          }),
        ),
      }));
    },
    cancelAppointment: ({ appointmentId, reason }) => {
      set((state) => ({
        appointments: replaceAppointment(
          state.appointments,
          appointmentId,
          ["booked", "checked_in", "waiting"],
          "cancel",
          (appointment) => ({
            ...appointment,
            status: "cancelled",
            cancellationReason: reason,
          }),
        ),
      }));
    },
    approveLeave: ({ leave }) => {
      set((state) => {
        const result = applyApprovedLeave({
          leave,
          appointments: state.appointments,
        });

        return {
          leaves: [...state.leaves, leave],
          appointments: result.appointments,
        };
      });
    },
    closeBusinessDay: ({ now }) => {
      set((state) => ({
        now,
        appointments: markEndOfDayNoShows({
          now,
          appointments: state.appointments,
        }),
      }));
    },
    advanceClock: (now) => set({ now }),
    resetFixtures: () => set(createInitialState()),
  };
}

export function createA0AppointmentStore() {
  return createStore<A0AppointmentStore>((set) => createState(set));
}

export const useA0AppointmentStore = create<A0AppointmentStore>((set) =>
  createState(set),
);
