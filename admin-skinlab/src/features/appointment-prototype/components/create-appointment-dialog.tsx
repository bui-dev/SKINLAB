"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import type { DoctorId, PrototypeDoctor } from "../model/types";
import { useA0AppointmentStore } from "../store/use-a0-appointment-store";

function toClinicIso(localDateTime: string) {
  return `${localDateTime}:00+07:00`;
}

export function CreateAppointmentDialog({
  doctors,
}: {
  doctors: PrototypeDoctor[];
}) {
  const createBookedAppointment = useA0AppointmentStore(
    (state) => state.createBookedAppointment,
  );
  const [open, setOpen] = useState(false);
  const [patientLabel, setPatientLabel] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [duration, setDuration] = useState("30");
  const [doctorId, setDoctorId] = useState<DoctorId>("doctor-1");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createBookedAppointment({
      patientLabel,
      scheduledStart: toClinicIso(scheduledStart),
      estimatedDurationMinutes: Number(duration),
      requestedDoctorId: doctorId,
      primaryDoctorId: doctorId,
    });
    setPatientLabel("");
    setScheduledStart("");
    setDuration("30");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Tạo cuộc hẹn</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo cuộc hẹn giả</DialogTitle>
          <DialogDescription>
            Chỉ dùng mã giả và dữ liệu mô phỏng trong A0.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1" htmlFor="booked-patient-label">
            <span>Mã bệnh nhân giả</span>
            <Input
              id="booked-patient-label"
              value={patientLabel}
              onChange={(event) => setPatientLabel(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-1" htmlFor="booked-scheduled-start">
            <span>Thời điểm hẹn</span>
            <Input
              id="booked-scheduled-start"
              type="datetime-local"
              value={scheduledStart}
              onChange={(event) => setScheduledStart(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-1" htmlFor="booked-duration">
            <span>Thời lượng dự kiến (phút)</span>
            <Input
              id="booked-duration"
              type="number"
              min={5}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-1" htmlFor="booked-doctor">
            <span>Bác sĩ ưu tiên</span>
            <select
              id="booked-doctor"
              className="h-9 rounded-md border bg-background px-3"
              value={doctorId}
              onChange={(event) => setDoctorId(event.target.value as DoctorId)}
            >
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.label}
                </option>
              ))}
            </select>
          </label>
          <DialogFooter>
            <Button type="submit">Lưu cuộc hẹn</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
