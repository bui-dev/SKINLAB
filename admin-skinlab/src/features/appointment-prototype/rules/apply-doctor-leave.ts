import type {
  DoctorId,
  PrototypeAppointment,
  PrototypeLeave,
} from "../model/types";

function appointmentDoctorId(
  appointment: PrototypeAppointment,
): DoctorId | undefined {
  return (
    appointment.assignedDoctorId ??
    appointment.requestedDoctorId ??
    appointment.primaryDoctorId
  );
}

function overlapsLeave(
  appointment: PrototypeAppointment,
  leave: PrototypeLeave,
) {
  if (
    appointment.status !== "booked" ||
    !appointment.scheduledStart ||
    appointmentDoctorId(appointment) !== leave.doctorId
  ) {
    return false;
  }

  const appointmentStartsAt = Date.parse(appointment.scheduledStart);
  const appointmentEndsAt =
    appointmentStartsAt + appointment.estimatedDurationMinutes * 60_000;

  return (
    appointmentStartsAt < Date.parse(leave.endsAt) &&
    appointmentEndsAt > Date.parse(leave.startsAt)
  );
}

export function applyApprovedLeave({
  leave,
  appointments,
}: {
  leave: PrototypeLeave;
  appointments: PrototypeAppointment[];
}): {
  appointments: PrototypeAppointment[];
  reschedulingAppointmentIds: string[];
} {
  const reschedulingAppointmentIds = appointments
    .filter((appointment) => overlapsLeave(appointment, leave))
    .map(({ id }) => id);
  const reschedulingIds = new Set(reschedulingAppointmentIds);

  return {
    appointments: appointments.map((appointment) =>
      reschedulingIds.has(appointment.id)
        ? { ...appointment, status: "needs_reschedule" }
        : appointment,
    ),
    reschedulingAppointmentIds,
  };
}
