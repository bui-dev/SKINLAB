export type DoctorId = "doctor-1" | "doctor-2";

export type AppointmentStatus =
  | "booked"
  | "checked_in"
  | "waiting"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "needs_reschedule";

export type AppointmentKind = "booked" | "walk_in";

export interface ClinicHours {
  opensAt: "09:00";
  closesAt: "19:00";
}

export interface PrototypeDoctor {
  id: DoctorId;
  label: string;
  availableFrom: string;
  availableTo: string;
}

export interface PrototypeAppointment {
  id: string;
  patientLabel: string;
  kind: AppointmentKind;
  status: AppointmentStatus;
  estimatedDurationMinutes: number;
  scheduledStart?: string;
  checkedInAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancellationReason?: string;
  requestedDoctorId?: DoctorId;
  primaryDoctorId?: DoctorId;
  assignedDoctorId?: DoctorId;
}

export interface PrototypeLeave {
  id: string;
  doctorId: DoctorId;
  startsAt: string;
  endsAt: string;
  status: "approved";
}

export interface A0FixtureSet {
  clinicHours: ClinicHours;
  doctors: PrototypeDoctor[];
  appointments: PrototypeAppointment[];
  leaves: PrototypeLeave[];
}
