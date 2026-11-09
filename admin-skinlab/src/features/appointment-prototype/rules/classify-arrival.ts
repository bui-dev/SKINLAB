export type ArrivalClassification = "on_time" | "within_grace" | "late";

export interface ClassifyArrivalInput {
  scheduledStart: string;
  checkedInAt: string;
  graceMinutes: number;
}

export function classifyArrival({
  scheduledStart,
  checkedInAt,
  graceMinutes,
}: ClassifyArrivalInput): ArrivalClassification {
  const elapsedMilliseconds =
    Date.parse(checkedInAt) - Date.parse(scheduledStart);

  if (elapsedMilliseconds <= 0) {
    return "on_time";
  }

  if (elapsedMilliseconds < graceMinutes * 60_000) {
    return "within_grace";
  }

  return "late";
}
