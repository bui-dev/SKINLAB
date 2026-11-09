"use client";

import { useMemo, useState, type FormEvent } from "react";

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
import { proposeWalkInOptions } from "../rules/propose-walk-in-options";
import { useA0AppointmentStore } from "../store/use-a0-appointment-store";

export function WalkInDialog({ doctors }: { doctors: PrototypeDoctor[] }) {
  const now = useA0AppointmentStore((state) => state.now);
  const appointments = useA0AppointmentStore((state) => state.appointments);
  const registerWalkIn = useA0AppointmentStore((state) => state.registerWalkIn);
  const [open, setOpen] = useState(false);
  const [patientLabel, setPatientLabel] = useState("");
  const [duration, setDuration] = useState("30");
  const [doctorId, setDoctorId] = useState<DoctorId | "">("");
  const proposals = useMemo(
    () =>
      proposeWalkInOptions({
        now,
        estimatedDurationMinutes: Number(duration) || 0,
        safetyBufferMinutes: 10,
        doctors,
        appointments,
      }),
    [appointments, doctors, duration, now],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    registerWalkIn({
      patientLabel,
      checkedInAt: now,
      estimatedDurationMinutes: Number(duration),
      primaryDoctorId: doctorId || undefined,
    });
    setPatientLabel("");
    setDuration("30");
    setDoctorId("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Tiếp nhận khách vãng lai</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tiếp nhận khách vãng lai giả</DialogTitle>
          <DialogDescription>
            Hệ thống chỉ đề xuất; lễ tân quyết định sau khi trao đổi với bệnh
            nhân.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1" htmlFor="walk-in-patient-label">
            <span>Mã bệnh nhân vãng lai giả</span>
            <Input
              id="walk-in-patient-label"
              value={patientLabel}
              onChange={(event) => setPatientLabel(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-1" htmlFor="walk-in-duration">
            <span>Thời lượng dự kiến (phút)</span>
            <Input
              id="walk-in-duration"
              type="number"
              min={5}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-1" htmlFor="walk-in-doctor">
            <span>Bác sĩ ưu tiên (nếu có)</span>
            <select
              id="walk-in-doctor"
              className="h-9 rounded-md border bg-background px-3"
              value={doctorId}
              onChange={(event) =>
                setDoctorId(event.target.value as DoctorId | "")
              }
            >
              <option value="">Không chỉ định</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.label}
                </option>
              ))}
            </select>
          </label>
          <section
            aria-label="Đề xuất khoảng trống an toàn"
            className="grid gap-2"
          >
            <h3 className="font-medium">Đề xuất khoảng trống an toàn</h3>
            {proposals.map((proposal) => (
              <p
                key={proposal.doctorId}
                className="text-sm text-muted-foreground"
              >
                {proposal.reason}
              </p>
            ))}
          </section>
          <DialogFooter>
            <Button type="submit">Thêm vào hàng chờ</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
