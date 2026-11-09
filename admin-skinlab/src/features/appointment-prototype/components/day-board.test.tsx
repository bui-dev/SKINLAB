import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useA0AppointmentStore } from "../store/use-a0-appointment-store";
import { DayBoard } from "./day-board";

describe("DayBoard", () => {
  afterEach(cleanup);

  beforeEach(() => {
    useA0AppointmentStore.getState().resetFixtures();
  });

  it("creates_a_booked_appointment_and_registers_a_walk_in", async () => {
    const user = userEvent.setup();
    render(<DayBoard />);

    await user.click(screen.getByRole("button", { name: "Tạo cuộc hẹn" }));
    await user.type(screen.getByLabelText("Mã bệnh nhân giả"), "BN-010");
    await user.type(screen.getByLabelText("Thời điểm hẹn"), "2026-11-10T14:00");
    await user.clear(screen.getByLabelText("Thời lượng dự kiến (phút)"));
    await user.type(screen.getByLabelText("Thời lượng dự kiến (phút)"), "40");
    await user.click(screen.getByRole("button", { name: "Lưu cuộc hẹn" }));

    expect(screen.getByText("BN-010")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Tiếp nhận khách vãng lai" }),
    );
    await user.type(
      screen.getByLabelText("Mã bệnh nhân vãng lai giả"),
      "BN-011",
    );
    await user.clear(screen.getByLabelText("Thời lượng dự kiến (phút)"));
    await user.type(screen.getByLabelText("Thời lượng dự kiến (phút)"), "30");
    await user.click(screen.getByRole("button", { name: "Thêm vào hàng chờ" }));

    expect(screen.getByText("BN-011")).toBeInTheDocument();
  });

  it("checks_in_and_progresses_a_booked_visit", async () => {
    const user = userEvent.setup();
    render(<DayBoard />);

    await user.click(screen.getByRole("button", { name: "Check-in BN-001" }));
    expect(screen.getByText("Đã check-in")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "Bắt đầu với BS-001 cho BN-001",
      }),
    );
    expect(screen.getByText("Đang phục vụ")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Hoàn thành BN-001" }));
    expect(screen.getByText("Đã hoàn thành")).toBeInTheDocument();
  });

  it("displays_late_priority_after_the_exact_grace_boundary", () => {
    useA0AppointmentStore.getState().advanceClock("2026-11-10T09:45:00+07:00");

    render(<DayBoard />);

    expect(screen.getByText("Đến muộn — mất ưu tiên")).toBeInTheDocument();
  });

  it("requires_an_explicit_substitute_choice", async () => {
    const user = userEvent.setup();
    const store = useA0AppointmentStore.getState();

    store.checkIn({
      appointmentId: "appointment-001",
      checkedInAt: "2026-11-10T09:00:00+07:00",
    });
    store.startService({
      appointmentId: "appointment-001",
      doctorId: "doctor-1",
    });
    const walkInId = store.registerWalkIn({
      patientLabel: "BN-010",
      checkedInAt: "2026-11-10T09:05:00+07:00",
      estimatedDurationMinutes: 30,
      primaryDoctorId: "doctor-1",
    });

    render(<DayBoard />);

    expect(screen.getByText(/Chờ BS-001/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Đổi sang BS-002 cho BN-010",
      }),
    );

    expect(
      useA0AppointmentStore
        .getState()
        .appointments.find(({ id }) => id === walkInId),
    ).toEqual(
      expect.objectContaining({
        status: "in_progress",
        assignedDoctorId: "doctor-2",
      }),
    );
  });

  it("resets_the_demo_to_its_fake_baseline", async () => {
    const user = userEvent.setup();
    useA0AppointmentStore.getState().registerWalkIn({
      patientLabel: "BN-010",
      checkedInAt: "2026-11-10T09:05:00+07:00",
      estimatedDurationMinutes: 30,
    });
    render(<DayBoard />);

    expect(screen.getByText("BN-010")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Đặt lại dữ liệu giả" }),
    );

    expect(screen.queryByText("BN-010")).not.toBeInTheDocument();
    expect(
      screen.getByText("A0 PROTOTYPE — FAKE DATA — NOT FOR PRODUCTION"),
    ).toBeInTheDocument();
  });
});
