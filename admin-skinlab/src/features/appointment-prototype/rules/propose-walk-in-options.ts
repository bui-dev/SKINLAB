import type {
  DoctorId,
  PrototypeAppointment,
  PrototypeDoctor,
} from "../model/types";

export interface WalkInProposalInput {
  now: string;
  estimatedDurationMinutes: number;
  safetyBufferMinutes: number;
  doctors: PrototypeDoctor[];
  appointments: PrototypeAppointment[];
}

export interface WalkInProposal {
  kind: "start_now" | "wait_until" | "reschedule";
  doctorId?: DoctorId;
  availableAt?: string;
  reason: string;
}

interface BlockingInterval {
  startsAt: string;
  endsAt: string;
}

const CLINIC_OFFSET_MILLISECONDS = 7 * 60 * 60 * 1_000;

function addMinutesInClinicTimezone(isoTimestamp: string, minutes: number) {
  const shifted = new Date(
    Date.parse(isoTimestamp) + minutes * 60_000 + CLINIC_OFFSET_MILLISECONDS,
  );

  return `${shifted.toISOString().slice(0, 19)}+07:00`;
}

function assignedDoctorId(
  appointment: PrototypeAppointment,
): DoctorId | undefined {
  return (
    appointment.assignedDoctorId ??
    appointment.requestedDoctorId ??
    appointment.primaryDoctorId
  );
}

function blockingIntervalsForDoctor(
  doctorId: DoctorId,
  appointments: PrototypeAppointment[],
): BlockingInterval[] {
  return appointments
    .filter(
      (appointment) =>
        assignedDoctorId(appointment) === doctorId &&
        (appointment.status === "booked" ||
          appointment.status === "in_progress"),
    )
    .flatMap((appointment) => {
      const startsAt =
        appointment.status === "in_progress"
          ? (appointment.checkedInAt ?? appointment.scheduledStart)
          : appointment.scheduledStart;

      if (!startsAt) {
        return [];
      }

      return [
        {
          startsAt,
          endsAt: addMinutesInClinicTimezone(
            startsAt,
            appointment.estimatedDurationMinutes,
          ),
        },
      ];
    })
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

function findEarliestSafeStart({
  now,
  durationWithBufferMinutes,
  doctor,
  appointments,
}: {
  now: string;
  durationWithBufferMinutes: number;
  doctor: PrototypeDoctor;
  appointments: PrototypeAppointment[];
}): string | undefined {
  let candidate =
    Date.parse(now) >= Date.parse(doctor.availableFrom)
      ? now
      : doctor.availableFrom;

  for (const interval of blockingIntervalsForDoctor(doctor.id, appointments)) {
    if (Date.parse(interval.endsAt) <= Date.parse(candidate)) {
      continue;
    }

    const candidateEndsAt = addMinutesInClinicTimezone(
      candidate,
      durationWithBufferMinutes,
    );

    if (Date.parse(candidateEndsAt) <= Date.parse(interval.startsAt)) {
      break;
    }

    candidate = interval.endsAt;
  }

  const candidateEndsAt = addMinutesInClinicTimezone(
    candidate,
    durationWithBufferMinutes,
  );

  return Date.parse(candidateEndsAt) <= Date.parse(doctor.availableTo)
    ? candidate
    : undefined;
}

export function proposeWalkInOptions({
  now,
  estimatedDurationMinutes,
  safetyBufferMinutes,
  doctors,
  appointments,
}: WalkInProposalInput): WalkInProposal[] {
  const durationWithBufferMinutes =
    estimatedDurationMinutes + safetyBufferMinutes;

  return doctors.map((doctor) => {
    const availableAt = findEarliestSafeStart({
      now,
      durationWithBufferMinutes,
      doctor,
      appointments,
    });

    if (!availableAt) {
      return {
        kind: "reschedule",
        doctorId: doctor.id,
        reason: "No safe gap remains during this doctor's shift.",
      };
    }

    if (Date.parse(availableAt) === Date.parse(now)) {
      return {
        kind: "start_now",
        doctorId: doctor.id,
        availableAt,
        reason:
          "Estimated service and safety buffer fit before the next protected booking.",
      };
    }

    return {
      kind: "wait_until",
      doctorId: doctor.id,
      availableAt,
      reason: `Starting now would overlap protected work; the next safe gap begins at ${availableAt}.`,
    };
  });
}
