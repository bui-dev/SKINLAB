import type { PrototypeAppointment } from "../model/types";

const clinicTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export function markEndOfDayNoShows({
  now,
  appointments,
}: {
  now: string;
  appointments: PrototypeAppointment[];
}): PrototypeAppointment[] {
  if (clinicTimeFormatter.format(new Date(now)) < "19:00:00") {
    return appointments;
  }

  return appointments.map((appointment) =>
    appointment.kind === "booked" &&
    appointment.status === "booked" &&
    !appointment.checkedInAt
      ? { ...appointment, status: "no_show" }
      : appointment,
  );
}
