# Appointments and Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the clinic's first working vertical slice for patient registration, doctor availability, appointment booking, check-in, late/no-show handling, doctor leave, and the hybrid walk-in queue.

**Architecture:** The web app calls scheduling and patient-registry interfaces exposed by the modular backend. Scheduling owns appointment/queue invariants; patient registry owns patient identity; catalog owns the service-duration data scheduling consumes.

**Tech Stack:** The foundation plan's pnpm monorepo, Next.js, NestJS, PostgreSQL/Prisma, Zod contracts, Vitest/Testcontainers, and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-skinlab-system-architecture-design.md`

**Phase B approval:** Roadmap approved on 2026-11-08; not authorized for execution because revalidation remains required. Revalidate against accepted A0 findings, actual Foundation interfaces, scheduling-policy ownership, PostgreSQL conflict behavior, and patient merge/reversal rules.

## Global Constraints

- One clinic, two doctors, default working hours 09:00–19:00 in `Asia/Ho_Chi_Minh`.
- Appointment duration is derived from ordered service stages and doctor segments; unknown service uses a configurable initial-assessment duration.
- A primary doctor is preferred when one exists, but permanent course ownership is not changed by a substitute appointment.
- Walk-ins may fill only safe gaps that preserve the next booked appointment plus safety buffer.
- T−10 minutes creates a contact task; T+15 minutes releases priority; remaining absent at 19:00 becomes `NO_SHOW`.
- External messaging integration is out of scope; reception records contact attempts manually.

## Review Focus

- Two concurrent booking requests for the same doctor/time must produce one booking and one conflict, never two appointments.
- A walk-in whose estimated doctor time crosses the next appointment's protected buffer must not be started.
- A patient who checks in at exactly T+15 must follow the documented late-arrival boundary consistently.
- Approving leave with existing appointments must preserve those appointments and create actionable rescheduling work.
- Re-running T−10 or 19:00 jobs must not duplicate contact tasks or change already-final appointment outcomes.

---

### Task 1: Build the patient registry and duplicate review workflow

**Files:**

- Create: `packages/contracts/src/patients.ts`
- Create: `api-skinlab/src/modules/patients/domain/patient.ts`
- Create: `api-skinlab/src/modules/patients/application/register-patient.ts`
- Create: `api-skinlab/src/modules/patients/application/find-duplicate-candidates.ts`
- Create: `api-skinlab/src/modules/patients/application/merge-patients.ts`
- Create: `api-skinlab/src/modules/patients/application/reverse-patient-merge.ts`
- Create: `api-skinlab/src/modules/patients/infrastructure/prisma-patient-repository.ts`
- Create: `api-skinlab/src/modules/patients/http/patients.controller.ts`
- Create: `api-skinlab/src/modules/patients/patients.module.ts`
- Create: `api-skinlab/src/modules/patients/application/register-patient.integration.test.ts`
- Create: `api-skinlab/src/modules/patients/application/patient-merge-reversal.integration.test.ts`
- Create: `admin-skinlab/src/features/patients/**`

**Interfaces:**

- Consumes: Foundation auth, audit, idempotency, and transaction manager.
- Produces: `registerPatient(command: RegisterPatientCommand): Promise<RegisterPatientResult>`; `findDuplicateCandidates(identity: PatientIdentity): Promise<DuplicateCandidate[]>`; `mergePatients(command: MergePatientsCommand): Promise<MergedPatient>`; `reversePatientMerge(command: ReversePatientMergeCommand): Promise<ReversedPatientMerge>`.

- [ ] **Step 1: Write failing registry tests**

Test required name/contact validation, normalized phone matching, likely-duplicate warning, admin-only audited merge, and preserved source-identity provenance.

- [ ] **Step 2: Run registry tests**

Run: `pnpm --filter @skinlab/api test:integration -- modules/patients`

Expected: FAIL because the patient module does not exist.

- [ ] **Step 3: Implement patient identity and duplicate candidates**

Require full name, known birth date/year when available, and at least one contact method. Never automatically merge candidates.

- [ ] **Step 4: Write failing controlled-reversal tests**

Cover admin-only reversal, restoration of source identities and downstream ownership links, rejection after a later incompatible merge/reassignment, immutable original merge history, duplicate reversal retry, and complete audit provenance.

- [ ] **Step 5: Implement registration, controlled merge, and reversal**

Use idempotency for registration; preserve all source identifiers and a reassignment ledger during merge. Reversal restores references through that ledger in one transaction and appends a reversal event; it never deletes or rewrites the original merge event.

- [ ] **Step 6: Add reception patient search/registration and admin reversal UI**

Display duplicate warnings before save and require explicit selection of existing patient or creation of a new patient. Expose reversal only to admin with impact preview, mandatory reason, and confirmation.

- [ ] **Step 7: Run tests and build**

Run: `pnpm --filter @skinlab/api test:integration -- modules/patients && pnpm --filter @skinlab/admin-web test && pnpm -r typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/contracts/src/patients.ts api-skinlab/src/modules/patients admin-skinlab/src/features/patients
git commit -m "feat(patients): add registry and duplicate review"
```

### Task 2: Add schedulable service-duration master data

**Files:**

- Create: `packages/contracts/src/catalog.ts`
- Create: `packages/contracts/src/scheduling-policy.ts`
- Create: `api-skinlab/src/modules/catalog/domain/service-definition.ts`
- Create: `api-skinlab/src/modules/catalog/application/save-service-definition.ts`
- Create: `api-skinlab/src/modules/catalog/application/estimate-appointment-duration.ts`
- Create: `api-skinlab/src/modules/catalog/infrastructure/prisma-service-repository.ts`
- Create: `api-skinlab/src/modules/catalog/http/services.controller.ts`
- Create: `api-skinlab/src/modules/catalog/catalog.module.ts`
- Create: `api-skinlab/src/modules/catalog/application/estimate-appointment-duration.test.ts`
- Create: `api-skinlab/src/modules/scheduling/domain/scheduling-policy.ts`
- Create: `api-skinlab/src/modules/scheduling/application/create-scheduling-policy-version.ts`
- Create: `api-skinlab/src/modules/scheduling/application/get-effective-scheduling-policy.ts`
- Create: `api-skinlab/src/modules/scheduling/infrastructure/prisma-scheduling-policy-repository.ts`
- Create: `api-skinlab/src/modules/scheduling/http/scheduling-policy.controller.ts`
- Create: `api-skinlab/src/modules/scheduling/application/scheduling-policy.test.ts`
- Create: `admin-skinlab/src/features/service-catalog/**`
- Create: `admin-skinlab/src/features/scheduling-policy/**`

**Interfaces:**

- Consumes: Admin authorization and audit.
- Produces: `ServiceDefinition { id, name, stages: ServiceStage[], totalPatientMinutes, version }`; `SchedulingPolicy { version, effectiveFrom, initialAssessmentMinutes, arrivalGraceMinutes, safeGapBufferMinutes }`; `getEffectiveSchedulingPolicy(at: Instant): Promise<SchedulingPolicy>`; `estimateAppointmentDuration(serviceIds: ServiceId[], policy: SchedulingPolicy): AppointmentEstimate` with ordered doctor segments and total patient time.

- [ ] **Step 1: Write failing duration tests**

Cover one doctor segment, multiple doctor segments separated by non-doctor work, several services in one session, unknown service falling back to `policy.initialAssessmentMinutes`, versioned policy effective dates, admin-only policy changes, and changed grace/buffer values consumed by scheduling rules.

- [ ] **Step 2: Run catalog and scheduling-policy tests**

Run: `pnpm --filter @skinlab/api test -- estimate-appointment-duration.test.ts scheduling-policy.test.ts`

Expected: FAIL because service definitions and the versioned scheduling policy do not exist.

- [ ] **Step 3: Implement versioned service definitions, scheduling policy, and estimates**

Stages use `DOCTOR` or `NON_DOCTOR`; the MVP records non-doctor work without assigning an assistant. Seed the owner-approved defaults `arrivalGraceMinutes=15`; keep initial-assessment and safe-gap values versioned rather than hard-coded.

- [ ] **Step 4: Add admin service-duration and scheduling-policy UI**

Allow ordered stages and minutes; show calculated doctor minutes and patient elapsed time before save. Policy edits create a future/effective version and never retroactively change historical appointment decisions.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @skinlab/api test -- modules/catalog && pnpm --filter @skinlab/api test -- scheduling-policy.test.ts && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/catalog.ts packages/contracts/src/scheduling-policy.ts api-skinlab/src/modules/catalog api-skinlab/src/modules/scheduling admin-skinlab/src/features/service-catalog admin-skinlab/src/features/scheduling-policy
git commit -m "feat(catalog): add schedulable service durations"
```

### Task 3: Implement doctor availability and leave approval

**Files:**

- Create: `packages/contracts/src/availability.ts`
- Create: `api-skinlab/src/modules/scheduling/domain/doctor-availability.ts`
- Create: `api-skinlab/src/modules/scheduling/domain/leave-request.ts`
- Create: `api-skinlab/src/modules/scheduling/application/request-leave.ts`
- Create: `api-skinlab/src/modules/scheduling/application/decide-leave.ts`
- Create: `api-skinlab/src/modules/scheduling/application/get-doctor-availability.ts`
- Create: `api-skinlab/src/modules/scheduling/infrastructure/prisma-availability-repository.ts`
- Create: `api-skinlab/src/modules/scheduling/application/leave-request.test.ts`
- Create: `admin-skinlab/src/features/doctor-leave/**`

**Interfaces:**

- Consumes: Identity roles, audit, clinic timezone, scheduled jobs.
- Produces: `requestLeave(command): Promise<LeaveRequest>`; `decideLeave(command): Promise<LeaveDecisionResult>` containing `affectedAppointmentIds`; `getDoctorAvailability(query): Promise<AvailabilityWindow[]>`.

- [ ] **Step 1: Write failing leave-policy tests**

Cover following-week request submitted Monday–Friday, late request rejection, admin approval/rejection, emergency admin leave with reason, and affected appointment identification.

- [ ] **Step 2: Run scheduling tests**

Run: `pnpm --filter @skinlab/api test -- leave-request.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement base schedule and leave exceptions**

Base availability is 09:00–19:00; approved leave subtracts unavailable windows without deleting existing appointments.

- [ ] **Step 4: Add doctor request and admin decision screens**

Show pending, approved, rejected, and emergency leave with affected-appointment counts.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @skinlab/api test -- modules/scheduling && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/availability.ts api-skinlab/src/modules/scheduling admin-skinlab/src/features/doctor-leave
git commit -m "feat(scheduling): add doctor availability and leave"
```

### Task 4: Implement conflict-safe appointment scheduling and rescheduling

**Files:**

- Create: `packages/contracts/src/appointments.ts`
- Create: `api-skinlab/src/modules/scheduling/domain/appointment.ts`
- Create: `api-skinlab/src/modules/scheduling/application/schedule-appointment.ts`
- Create: `api-skinlab/src/modules/scheduling/application/reschedule-appointment.ts`
- Create: `api-skinlab/src/modules/scheduling/application/cancel-appointment.ts`
- Create: `api-skinlab/src/modules/scheduling/infrastructure/prisma-appointment-repository.ts`
- Create: `api-skinlab/src/modules/scheduling/http/appointments.controller.ts`
- Create: `api-skinlab/src/modules/scheduling/application/schedule-appointment.integration.test.ts`
- Create: `admin-skinlab/src/features/appointments/**`

**Interfaces:**

- Consumes: Patient ID, doctor availability, service estimate, transaction manager, idempotency.
- Produces: `scheduleAppointment(command: ScheduleAppointmentCommand): Promise<Appointment>`; `rescheduleAppointment(command): Promise<{ original: Appointment; replacement: Appointment }>`; states `BOOKED`, `NEEDS_RESCHEDULING`, `CANCELLED`, `NO_SHOW`, `COMPLETED`.

- [ ] **Step 1: Write failing scheduling tests**

Test two concurrent bookings, approved leave conflict, start/end ordering, requested-doctor preference, reschedule history link, and cancellation reason.

- [ ] **Step 2: Run appointment integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- schedule-appointment.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement appointment aggregate and database conflict protection**

Use transactional conflict checks plus a PostgreSQL exclusion/locking strategy that prevents overlapping doctor segments under concurrency.

- [ ] **Step 4: Implement rescheduling tasks after leave approval**

Changing to a replacement appointment preserves the original status/reason and contact history.

- [ ] **Step 5: Add reception calendar UI**

Show both doctors, patient time, doctor segments, requested/assigned doctor, conflict explanation, and replacement link.

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm --filter @skinlab/api test:integration -- modules/scheduling && pnpm --filter @skinlab/admin-web test && pnpm -r typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts/src/appointments.ts api-skinlab/src/modules/scheduling admin-skinlab/src/features/appointments
git commit -m "feat(scheduling): add conflict-safe appointments"
```

### Task 5: Implement check-in, late arrival, contact tasks, and no-show jobs

**Files:**

- Create: `packages/contracts/src/check-in.ts`
- Create: `api-skinlab/src/modules/scheduling/domain/check-in.ts`
- Create: `api-skinlab/src/modules/scheduling/application/check-in-patient.ts`
- Create: `api-skinlab/src/modules/scheduling/application/record-contact-attempt.ts`
- Create: `api-skinlab/src/modules/scheduling/jobs/create-contact-reminders.ts`
- Create: `api-skinlab/src/modules/scheduling/jobs/mark-no-shows.ts`
- Create: `api-skinlab/src/modules/scheduling/application/check-in-patient.test.ts`
- Create: `api-skinlab/src/modules/scheduling/jobs/no-show-jobs.integration.test.ts`
- Create: `admin-skinlab/src/features/check-in/**`

**Interfaces:**

- Consumes: Appointment, clinic timezone, job runner, audit, and the effective `SchedulingPolicy` from Task 2.
- Produces: `checkInPatient(command): Promise<CheckInResult>` with `ON_TIME | LATE`; `recordContactAttempt(command): Promise<ContactAttempt>`; idempotent jobs for T−10 and 19:00.

- [ ] **Step 1: Write failing boundary tests**

Cover before appointment, exactly at appointment, T+14:59, T+15:00, a changed grace-policy value, patient-reported delay, duplicate contact job, checked-in reminder suppression, cancelled/rescheduled/final-state reminder suppression, and no-show rerun.

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @skinlab/api test -- check-in-patient.test.ts && pnpm --filter @skinlab/api test:integration -- no-show-jobs.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement check-in and contact records**

Late arrival releases priority but does not cancel the appointment. Contact outcomes are `NOT_CONTACTED`, `AWAITING_RESPONSE`, `CONFIRMED`, or `RESCHEDULE_REQUESTED`.

- [ ] **Step 4: Implement scheduled reminders and no-show closure**

Jobs query by clinic-local time and remain safe on retry. T−10 creates a contact task only for an active booked appointment that has not checked in; cancelled, rescheduled, no-show, completed, and already checked-in records are excluded.

- [ ] **Step 5: Add reception check-in/contact UI**

Show due reminders, last contact attempt, grace-period countdown, and explicit late/no-show status.

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @skinlab/api test -- modules/scheduling && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts/src/check-in.ts api-skinlab/src/modules/scheduling admin-skinlab/src/features/check-in
git commit -m "feat(scheduling): add check-in late and no-show handling"
```

### Task 6: Implement the hybrid walk-in queue

**Files:**

- Create: `packages/contracts/src/queue.ts`
- Create: `api-skinlab/src/modules/scheduling/domain/waiting-queue.ts`
- Create: `api-skinlab/src/modules/scheduling/application/enqueue-walk-in.ts`
- Create: `api-skinlab/src/modules/scheduling/application/propose-walk-in-options.ts`
- Create: `api-skinlab/src/modules/scheduling/application/start-queue-entry.ts`
- Create: `api-skinlab/src/modules/scheduling/application/propose-walk-in-options.test.ts`
- Create: `admin-skinlab/src/features/waiting-queue/**`

**Interfaces:**

- Consumes: Doctor availability, appointment estimates, next protected appointment, and `getEffectiveSchedulingPolicy(at)` from Task 2; safe-gap decisions use the returned `safeGapBufferMinutes` value.
- Produces: `proposeWalkInOptions(command): Promise<WalkInOption[]>`; `enqueueWalkIn(command): Promise<QueueEntry>`; option reasons `SAFE_GAP`, `ALTERNATE_DOCTOR`, `WAIT_NEXT_GAP`, `BOOK_LATER`, `CLINICAL_REVIEW_REQUIRED`.

- [ ] **Step 1: Write failing hybrid-policy tests**

Cover a walk-in fitting with buffer, crossing buffer by one minute, both doctors busy, primary-doctor preference, patient accepting substitute, clinician-marked priority, and an effective policy version with a changed `safeGapBufferMinutes` value altering the proposed option.

- [ ] **Step 2: Run queue tests**

Run: `pnpm --filter @skinlab/api test -- propose-walk-in-options.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement safe-gap calculation**

Reception cannot independently mark clinical urgency; only an authorized doctor decision creates `CLINICAL_REVIEW_REQUIRED` priority.

- [ ] **Step 4: Add queue UI**

Display checked-in booked patients, late arrivals, walk-ins, in-progress work, estimated doctor release, and why each proposed option is safe or blocked.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @skinlab/api test -- modules/scheduling && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/queue.ts api-skinlab/src/modules/scheduling admin-skinlab/src/features/waiting-queue
git commit -m "feat(scheduling): add protected hybrid walk-in queue"
```

### Task 7: Deliver the reception day board and E2E acceptance journey

**Files:**

- Create: `api-skinlab/src/modules/scheduling/application/get-day-board.ts`
- Create: `api-skinlab/src/modules/scheduling/http/day-board.controller.ts`
- Create: `admin-skinlab/src/app/(authenticated)/reception/day/page.tsx`
- Create: `admin-skinlab/src/features/day-board/**`
- Create: `tests/e2e/appointments-queue.spec.ts`

**Interfaces:**

- Consumes: Patient registry, appointments, check-ins, queue, leave, contact tasks.
- Produces: `getDayBoard(date: LocalDate): Promise<DayBoard>` and production-like E2E workflow.

- [ ] **Step 1: Write the failing E2E journey**

Register patient, book requested doctor, create conflicting attempt, check in late, insert safe walk-in, approve doctor leave, reschedule affected appointment, run no-show closure.

- [ ] **Step 2: Run E2E**

Run: `pnpm test:e2e -- appointments-queue.spec.ts`

Expected: FAIL until day-board integration exists.

- [ ] **Step 3: Implement the day-board query and screen**

Keep the read model optimized for the day's workflow without allowing it to bypass module command interfaces.

- [ ] **Step 4: Run the phase quality gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm test:e2e -- appointments-queue.spec.ts && pnpm build`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add api-skinlab/src/modules/scheduling admin-skinlab/src tests/e2e/appointments-queue.spec.ts
git commit -m "feat: deliver appointment and queue vertical slice"
```
