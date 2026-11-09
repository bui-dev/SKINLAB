"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { createA0Fixtures } from "../model/fixtures";
import { rankWaitingEntries } from "../rules/rank-waiting-entries";
import { useA0AppointmentStore } from "../store/use-a0-appointment-store";
import { AppointmentCard } from "./appointment-card";
import { CreateAppointmentDialog } from "./create-appointment-dialog";
import { DoctorColumn } from "./doctor-column";
import { DoctorLeaveDialog } from "./doctor-leave-dialog";
import { PrototypeBanner } from "./prototype-banner";
import { ReschedulingList } from "./rescheduling-list";
import { WalkInDialog } from "./walk-in-dialog";

const doctors = createA0Fixtures().doctors;

function toLocalDateTime(timestamp: string) {
  return timestamp.slice(0, 16);
}

export function DayBoard() {
  const now = useA0AppointmentStore((state) => state.now);
  const appointments = useA0AppointmentStore((state) => state.appointments);
  const advanceClock = useA0AppointmentStore((state) => state.advanceClock);
  const closeBusinessDay = useA0AppointmentStore(
    (state) => state.closeBusinessDay,
  );
  const resetFixtures = useA0AppointmentStore((state) => state.resetFixtures);
  const [clockInput, setClockInput] = useState(toLocalDateTime(now));
  const rankedAppointments = rankWaitingEntries({ now, appointments });
  const unassignedAppointments = rankedAppointments.filter(
    ({ assignedDoctorId }) => !assignedDoctorId,
  );

  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-8 p-6">
      <PrototypeBanner />

      <header className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold">Bảng điều phối trong ngày</h1>
          <p className="text-muted-foreground">
            Hai bác sĩ · 09:00–19:00 · toàn bộ dữ liệu là giả
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CreateAppointmentDialog doctors={doctors} />
          <WalkInDialog doctors={doctors} />
          <DoctorLeaveDialog doctors={doctors} />
          <Button variant="outline" onClick={resetFixtures}>
            Đặt lại dữ liệu giả
          </Button>
        </div>
      </header>

      <section className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
        <label className="grid gap-1" htmlFor="prototype-clock">
          <span className="text-sm font-medium">Giờ mô phỏng</span>
          <Input
            id="prototype-clock"
            type="datetime-local"
            value={clockInput}
            onChange={(event) => setClockInput(event.target.value)}
          />
        </label>
        <Button
          variant="outline"
          onClick={() => advanceClock(`${clockInput}:00+07:00`)}
        >
          Cập nhật giờ mô phỏng
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            closeBusinessDay({ now: `${now.slice(0, 10)}T19:00:00+07:00` })
          }
        >
          Đóng ngày lúc 19:00
        </Button>
        <p className="text-sm text-muted-foreground">
          Hiện tại: {now.slice(11, 16)}
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {doctors.map((doctor) => (
          <DoctorColumn
            key={doctor.id}
            doctor={doctor}
            doctors={doctors}
            appointments={rankedAppointments.filter(
              ({ assignedDoctorId }) => assignedDoctorId === doctor.id,
            )}
            now={now}
          />
        ))}
      </div>

      <ReschedulingList appointments={appointments} doctors={doctors} />

      <section aria-labelledby="unassigned-queue" className="grid gap-4">
        <h2 id="unassigned-queue" className="text-xl font-semibold">
          Hàng chờ chưa gán bác sĩ
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {unassignedAppointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              doctors={doctors}
              now={now}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
