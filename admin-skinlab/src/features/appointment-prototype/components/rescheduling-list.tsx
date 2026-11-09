import type { PrototypeAppointment, PrototypeDoctor } from "../model/types";

function timeLabel(timestamp?: string) {
  return timestamp?.slice(11, 16) ?? "—";
}

export function ReschedulingList({
  appointments,
  doctors,
}: {
  appointments: PrototypeAppointment[];
  doctors: PrototypeDoctor[];
}) {
  const affectedAppointments = appointments.filter(
    ({ status }) => status === "needs_reschedule",
  );

  return (
    <section aria-labelledby="rescheduling-list" className="grid gap-4">
      <div>
        <h2 id="rescheduling-list" className="text-xl font-semibold">
          Lịch cần sắp lại
        </h2>
        <p className="text-sm text-muted-foreground">
          Lễ tân liên hệ thủ công; prototype không gửi Zalo, Messenger hoặc
          Telegram.
        </p>
      </div>
      {affectedAppointments.length ? (
        <ul className="grid gap-3">
          {affectedAppointments.map((appointment) => {
            const doctor = doctors.find(
              ({ id }) => id === appointment.assignedDoctorId,
            );

            return (
              <li key={appointment.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{appointment.patientLabel}</strong>
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
                    Cần liên hệ thủ công
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {doctor?.label ?? "Chưa gán bác sĩ"} · lịch cũ{" "}
                  {timeLabel(appointment.scheduledStart)}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Chưa có lịch cần sắp lại.
        </p>
      )}
    </section>
  );
}
