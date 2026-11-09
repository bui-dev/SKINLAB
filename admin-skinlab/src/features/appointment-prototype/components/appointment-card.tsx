"use client";

import { Button } from "@/components/ui/button";

import type { PrototypeAppointment, PrototypeDoctor } from "../model/types";
import { classifyArrival } from "../rules/classify-arrival";
import { proposeDoctorOptions } from "../rules/propose-doctor-options";
import { useA0AppointmentStore } from "../store/use-a0-appointment-store";

const statusLabels: Record<PrototypeAppointment["status"], string> = {
  booked: "Đã đặt lịch",
  checked_in: "Đã check-in",
  waiting: "Đang chờ",
  in_progress: "Đang phục vụ",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
  no_show: "Không đến",
  needs_reschedule: "Cần sắp lại lịch",
};

function timeLabel(timestamp?: string) {
  return timestamp?.slice(11, 16) ?? "—";
}

export function AppointmentCard({
  appointment,
  doctors,
  now,
}: {
  appointment: PrototypeAppointment;
  doctors: PrototypeDoctor[];
  now: string;
}) {
  const appointments = useA0AppointmentStore((state) => state.appointments);
  const checkIn = useA0AppointmentStore((state) => state.checkIn);
  const startService = useA0AppointmentStore((state) => state.startService);
  const completeService = useA0AppointmentStore(
    (state) => state.completeService,
  );
  const preferredDoctorId =
    appointment.requestedDoctorId ?? appointment.primaryDoctorId;
  const doctorProposals =
    appointment.status === "checked_in" || appointment.status === "waiting"
      ? proposeDoctorOptions({
          now,
          estimatedDurationMinutes: appointment.estimatedDurationMinutes,
          requestedDoctorId: appointment.requestedDoctorId,
          primaryDoctorId: appointment.primaryDoctorId,
          doctors,
          appointments,
        })
      : [];
  const arrival =
    appointment.kind === "booked" && appointment.scheduledStart
      ? classifyArrival({
          scheduledStart: appointment.scheduledStart,
          checkedInAt: appointment.checkedInAt ?? now,
          graceMinutes: 15,
        })
      : undefined;

  return (
    <article className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{appointment.patientLabel}</h3>
          <p className="text-sm text-muted-foreground">
            {appointment.kind === "booked" ? "Đặt trước" : "Vãng lai"} ·{" "}
            {appointment.estimatedDurationMinutes} phút
          </p>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
          {statusLabels[appointment.status]}
        </span>
      </div>

      {appointment.scheduledStart ? (
        <p className="text-sm">
          Giờ hẹn: {timeLabel(appointment.scheduledStart)}
        </p>
      ) : null}
      {arrival === "late" ? (
        <p className="text-sm font-medium text-destructive">
          Đến muộn — mất ưu tiên
        </p>
      ) : arrival === "within_grace" ? (
        <p className="text-sm font-medium text-amber-700">
          Trong thời gian ưu tiên 15 phút
        </p>
      ) : null}

      {appointment.status === "booked" ? (
        <Button
          size="sm"
          onClick={() =>
            checkIn({ appointmentId: appointment.id, checkedInAt: now })
          }
        >
          Check-in {appointment.patientLabel}
        </Button>
      ) : null}

      {doctorProposals.map((proposal) => {
        const doctor = doctors.find(({ id }) => id === proposal.doctorId);

        if (!doctor) return null;

        if (proposal.kind === "wait") {
          return (
            <p key={`${proposal.kind}-${doctor.id}`} className="text-sm">
              Chờ {doctor.label} đến {timeLabel(proposal.availableAt)}
            </p>
          );
        }

        const isSubstitute = proposal.kind === "substitute";
        const actionLabel = isSubstitute
          ? preferredDoctorId
            ? `Đổi sang ${doctor.label} cho ${appointment.patientLabel}`
            : `Chọn ${doctor.label} cho ${appointment.patientLabel}`
          : `Bắt đầu với ${doctor.label} cho ${appointment.patientLabel}`;

        return (
          <Button
            key={`${proposal.kind}-${doctor.id}`}
            size="sm"
            variant={isSubstitute ? "outline" : "default"}
            onClick={() =>
              startService({
                appointmentId: appointment.id,
                doctorId: doctor.id,
              })
            }
          >
            {actionLabel}
          </Button>
        );
      })}

      {appointment.status === "in_progress" ? (
        <Button
          size="sm"
          onClick={() =>
            completeService({ appointmentId: appointment.id, completedAt: now })
          }
        >
          Hoàn thành {appointment.patientLabel}
        </Button>
      ) : null}
    </article>
  );
}
