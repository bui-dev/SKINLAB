import type {
  DoctorId,
  PrototypeAppointment,
  PrototypeDoctor,
} from "../model/types";
import { proposeWalkInOptions } from "./propose-walk-in-options";

export interface DoctorProposalInput {
  now: string;
  estimatedDurationMinutes: number;
  requestedDoctorId?: DoctorId;
  primaryDoctorId?: DoctorId;
  doctors: PrototypeDoctor[];
  appointments: PrototypeAppointment[];
}

export interface DoctorProposal {
  kind: "primary" | "substitute" | "wait";
  doctorId?: DoctorId;
  availableAt?: string;
}

export function proposeDoctorOptions({
  now,
  estimatedDurationMinutes,
  requestedDoctorId,
  primaryDoctorId,
  doctors,
  appointments,
}: DoctorProposalInput): DoctorProposal[] {
  const preferredDoctorId = requestedDoctorId ?? primaryDoctorId;
  const availability = proposeWalkInOptions({
    now,
    estimatedDurationMinutes,
    safetyBufferMinutes: 0,
    doctors,
    appointments,
  });
  const proposals: DoctorProposal[] = [];

  if (preferredDoctorId) {
    const preferredAvailability = availability.find(
      ({ doctorId }) => doctorId === preferredDoctorId,
    );

    if (preferredAvailability?.kind === "start_now") {
      proposals.push({
        kind: "primary",
        doctorId: preferredDoctorId,
        availableAt: preferredAvailability.availableAt,
      });
    } else {
      proposals.push({
        kind: "wait",
        doctorId: preferredDoctorId,
        availableAt: preferredAvailability?.availableAt,
      });
    }
  }

  for (const option of availability) {
    if (option.doctorId !== preferredDoctorId && option.kind === "start_now") {
      proposals.push({
        kind: "substitute",
        doctorId: option.doctorId,
        availableAt: option.availableAt,
      });
    }
  }

  return proposals;
}
