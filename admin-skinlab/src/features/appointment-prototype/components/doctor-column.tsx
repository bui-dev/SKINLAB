import type { PrototypeAppointment, PrototypeDoctor } from "../model/types";
import { AppointmentCard } from "./appointment-card";

export function DoctorColumn({
  doctor,
  doctors,
  appointments,
  now,
}: {
  doctor: PrototypeDoctor;
  doctors: PrototypeDoctor[];
  appointments: PrototypeAppointment[];
  now: string;
}) {
  return (
    <section
      aria-labelledby={`doctor-${doctor.id}`}
      className="grid content-start gap-4"
    >
      <div>
        <h2 id={`doctor-${doctor.id}`} className="text-xl font-semibold">
          {doctor.label}
        </h2>
        <p className="text-sm text-muted-foreground">09:00–19:00</p>
      </div>
      {appointments.length ? (
        appointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            doctors={doctors}
            now={now}
          />
        ))
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Chưa có lịch được gán.
        </p>
      )}
    </section>
  );
}
