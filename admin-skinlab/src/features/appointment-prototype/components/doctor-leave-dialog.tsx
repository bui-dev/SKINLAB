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

export function DoctorLeaveDialog({ doctors }: { doctors: PrototypeDoctor[] }) {
  const approveLeave = useA0AppointmentStore((state) => state.approveLeave);
  const leaves = useA0AppointmentStore((state) => state.leaves);
  const [open, setOpen] = useState(false);
  const [doctorId, setDoctorId] = useState<DoctorId>("doctor-1");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    approveLeave({
      leave: {
        id: `leave-a0-${String(leaves.length + 1).padStart(3, "0")}`,
        doctorId,
        startsAt: toClinicIso(startsAt),
        endsAt: toClinicIso(endsAt),
        status: "approved",
      },
    });
    setStartsAt("");
    setEndsAt("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Duyệt lịch nghỉ bác sĩ</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duyệt lịch nghỉ giả lập</DialogTitle>
          <DialogDescription>
            Cuộc hẹn bị ảnh hưởng sẽ được giữ lại và chuyển cho lễ tân sắp lại.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1" htmlFor="leave-doctor">
            <span>Bác sĩ nghỉ</span>
            <select
              id="leave-doctor"
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
          <label className="grid gap-1" htmlFor="leave-start">
            <span>Bắt đầu nghỉ</span>
            <Input
              id="leave-start"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              required
            />
          </label>
          <label className="grid gap-1" htmlFor="leave-end">
            <span>Kết thúc nghỉ</span>
            <Input
              id="leave-end"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              required
            />
          </label>
          <DialogFooter>
            <Button type="submit">Phê duyệt lịch nghỉ</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
