CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "outcome" JSONB,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_runs_jobName_scheduledFor_key" ON "job_runs"("jobName", "scheduledFor");
CREATE INDEX "job_runs_status_idx" ON "job_runs"("status");
CREATE INDEX "job_runs_scheduledFor_idx" ON "job_runs"("scheduledFor");

