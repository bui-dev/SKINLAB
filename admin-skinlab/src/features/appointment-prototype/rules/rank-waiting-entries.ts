import type { PrototypeAppointment } from "../model/types";
import { classifyArrival } from "./classify-arrival";

const GRACE_MINUTES = 15;

export interface RankWaitingEntriesInput {
  now: string;
  appointments: PrototypeAppointment[];
}

function hasProtectedBookedPriority(
  appointment: PrototypeAppointment,
  now: string,
): boolean {
  if (appointment.kind !== "booked" || !appointment.scheduledStart) {
    return false;
  }

  return (
    classifyArrival({
      scheduledStart: appointment.scheduledStart,
      checkedInAt: appointment.checkedInAt ?? now,
      graceMinutes: GRACE_MINUTES,
    }) !== "late"
  );
}

export function rankWaitingEntries({
  now,
  appointments,
}: RankWaitingEntriesInput): PrototypeAppointment[] {
  return [...appointments].sort((left, right) => {
    const leftHasPriority = hasProtectedBookedPriority(left, now);
    const rightHasPriority = hasProtectedBookedPriority(right, now);

    if (leftHasPriority !== rightHasPriority) {
      return leftHasPriority ? -1 : 1;
    }

    const leftCheckedInAt = left.checkedInAt ?? now;
    const rightCheckedInAt = right.checkedInAt ?? now;
    const checkInComparison = leftCheckedInAt.localeCompare(rightCheckedInAt);

    if (checkInComparison !== 0) {
      return checkInComparison;
    }

    return left.id.localeCompare(right.id);
  });
}
