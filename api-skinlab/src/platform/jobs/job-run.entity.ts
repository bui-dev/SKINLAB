// All comments in this file are in English per project rules.

export const CLINIC_TIMEZONE = "Asia/Ho_Chi_Minh" as const;

export const JOB_STATUSES = ["RUNNING", "COMPLETED", "FAILED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const DEFAULT_LEASE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes lease duration

export type JobResult = Record<string, unknown>;

export type JobRunEntity<T = JobResult> = {
  id: string;
  jobName: string;
  scheduledFor: Date;
  startedAt: Date;
  finishedAt: Date | null;
  status: JobStatus;
  outcome: T | null;
  errorSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Alias per task interface specification
export type JobRun<T = JobResult> = JobRunEntity<T>;

export class JobAlreadyRunningError extends Error {
  constructor(jobName: string, scheduledFor: Date) {
    super(
      `Job "${jobName}" scheduled for "${scheduledFor.toISOString()}" is already running under an active lease.`,
    );
    this.name = "JobAlreadyRunningError";
  }
}

export class JobAlreadyCompletedError extends Error {
  constructor(jobName: string, scheduledFor: Date) {
    super(
      `Job "${jobName}" scheduled for "${scheduledFor.toISOString()}" has already completed.`,
    );
    this.name = "JobAlreadyCompletedError";
  }
}

export class JobExecutionFailedError extends Error {
  constructor(jobName: string, originalMessage: string) {
    super(`Job "${jobName}" execution failed: ${originalMessage}`);
    this.name = "JobExecutionFailedError";
  }
}

/**
 * Resolves a date input (string or Date) into a UTC Date guaranteed to reflect
 * clinic-local time in Asia/Ho_Chi_Minh (+07:00), invariant to server host TZ.
 */
export function parseClinicScheduledDate(
  dateInput: string | Date,
  timeString?: string,
): Date {
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      throw new Error("Invalid Date object provided.");
    }
    return dateInput;
  }

  const trimmed = dateInput.trim();
  if (trimmed.length === 0) {
    throw new Error("Date string cannot be empty.");
  }

  // If string already specifies a timezone offset (+07:00 or Z), parse directly
  if (trimmed.includes("Z") || trimmed.includes("+") || /-\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Failed to parse ISO date string: ${dateInput}`);
    }
    return parsed;
  }

  // Clinic local date/time: e.g. "2026-11-12" and "19:00:00" or "2026-11-12T19:00:00"
  let combined = trimmed;
  if (timeString) {
    combined = `${combined.split("T")[0]}T${timeString.trim()}`;
  }
  if (!combined.includes("T")) {
    combined = `${combined}T00:00:00`;
  }

  // Asia/Ho_Chi_Minh operates strictly on UTC+7 with no daylight saving time (DST)
  const clinicOffset = "+07:00";
  const parsed = new Date(`${combined}${clinicOffset}`);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Failed to parse clinic scheduled date: ${dateInput}`);
  }
  return parsed;
}

