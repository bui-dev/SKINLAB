import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useA0AppointmentStore } from "../store/use-a0-appointment-store";
import { DayBoard } from "./day-board";

describe("doctor leave and end-of-day flow", () => {
  afterEach(cleanup);

  beforeEach(() => {
    useA0AppointmentStore.getState().resetFixtures();
  });

  it("preserves_appointments_and_lists_manual_rescheduling_work", async () => {
    const user = userEvent.setup();
    render(<DayBoard />);

    await user.click(
      screen.getByRole("button", { name: "Duyệt lịch nghỉ bác sĩ" }),
    );
    await user.type(screen.getByLabelText("Bắt đầu nghỉ"), "2026-11-10T09:00");
    await user.type(screen.getByLabelText("Kết thúc nghỉ"), "2026-11-10T10:30");
    await user.click(
      screen.getByRole("button", { name: "Phê duyệt lịch nghỉ" }),
    );

    const reschedulingList = screen.getByRole("region", {
      name: "Lịch cần sắp lại",
    });
    expect(within(reschedulingList).getByText("BN-001")).toBeInTheDocument();
    expect(
      within(reschedulingList).getByText("Cần liên hệ thủ công"),
    ).toBeInTheDocument();
    expect(
      useA0AppointmentStore
        .getState()
        .appointments.find(({ id }) => id === "appointment-001"),
    ).toEqual(
      expect.objectContaining({
        status: "needs_reschedule",
        scheduledStart: "2026-11-10T09:30:00+07:00",
        assignedDoctorId: "doctor-1",
      }),
    );
  });

  it("closes_the_day_and_marks_only_unarrived_bookings_no_show", async () => {
    const user = userEvent.setup();
    useA0AppointmentStore.getState().checkIn({
      appointmentId: "appointment-001",
      checkedInAt: "2026-11-10T09:20:00+07:00",
    });
    render(<DayBoard />);

    await user.click(
      screen.getByRole("button", { name: "Đóng ngày lúc 19:00" }),
    );

    const appointments = useA0AppointmentStore.getState().appointments;
    expect(
      appointments.find(({ id }) => id === "appointment-001")?.status,
    ).toBe("checked_in");
    expect(
      appointments.find(({ id }) => id === "appointment-003")?.status,
    ).toBe("no_show");
    expect(screen.getByText("Không đến")).toBeInTheDocument();
  });
});
