# Appointments and Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the clinic's first working vertical slice for patient registration, doctor availability, appointment booking, check-in, late/no-show handling, doctor leave, and the hybrid walk-in queue.

**Architecture:** The web app calls scheduling and patient-registry interfaces exposed by the modular backend. Scheduling owns appointment/queue invariants; patient registry owns patient identity; catalog owns the service-duration data scheduling consumes.

**Tech Stack:** The foundation plan's pnpm monorepo, Next.js, NestJS, PostgreSQL/Prisma, Zod contracts, Vitest/Testcontainers, and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-skinlab-system-architecture-design.md`

**Phase B approval:** Roadmap approved on 2026-11-08. A0 business revalidation was completed on 2026-11-09 against prototype commit `24c28dd1f75277003e0bcd4eb95b8d3c16ba1f65`; the accepted findings are incorporated below. This plan remains unauthorized for execution until its Foundation interfaces and remaining dependency gates are verified and the Product Owner gives a separate start instruction.

## A0 Revalidation Baseline

- F-001: expose operating-date context, distinguish absent-after-grace from actual late check-in, and suppress misleading cross-date/time presentation.
- F-002: normal scheduling rejects past/out-of-hours starts in UI and backend; migration/backfill is a separate authorized/audited path.
- F-003/F-004: safe-gap options are doctor-labelled, localized decision support with explicit actions, calculation context, and no silent assignment.
- F-005: leave approval previews conflicts and creates owned contact tasks with the approved two-working-hour/next-day-10:00/under-24-hour SLA and escalation.
- F-006: appointment status has display precedence; non-queue/terminal states suppress late/grace labels.
- F-007: the idempotent 19:00 no-show sweep is separate from final day closure and preserves active-patient exceptions.
- Prototype components/store are reference evidence only and must not be copied into production paths without normal design, tests, security review, and Definition of Done.

## Global Constraints

- One clinic, two doctors, default working hours 09:00–19:00 in `Asia/Ho_Chi_Minh`.
- Appointment duration is derived from ordered service stages and doctor segments; unknown service uses a configurable initial-assessment duration.
- A primary doctor is preferred when one exists, but permanent course ownership is not changed by a substitute appointment.
- A substitute for the current visit requires explicit customer agreement and is never assigned silently.
- Walk-ins may fill only safe gaps that preserve the next booked appointment plus safety buffer.
- T−10 minutes creates a contact task; T+15 minutes releases priority; remaining absent at 19:00 becomes `NO_SHOW`.
- The active operating date is explicit; normal appointment creation rejects past/out-of-hours starts at both contract and UI boundaries.
- The 19:00 no-show sweep does not close active checked-in/waiting/in-progress work; final day closure handles owned exceptions separately.
- External messaging integration is out of scope; reception records contact attempts manually.

## Review Focus

- Two concurrent booking requests for the same doctor/time must produce one booking and one conflict, never two appointments.
- A walk-in whose estimated doctor time crosses the next appointment's protected buffer must not be started.
- A patient who checks in at exactly T+15 must follow the documented late-arrival boundary consistently.
- Approving leave with existing appointments must preserve those appointments and create actionable rescheduling work.
- Re-running T−10 or 19:00 jobs must not duplicate contact tasks or change already-final appointment outcomes.
- Terminal/non-queue cards must never render contradictory late/grace labels.
- Safe-gap explanations must identify the doctor, local time, duration, buffer, blocking work, and explicit action in Vietnamese.
- Leave conflicts must receive owned contact work within the approved SLA and escalate while unresolved.

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
- Create: `api-skinlab/src/modules/scheduling/application/preview-leave-impact.ts`
- Create: `api-skinlab/src/modules/scheduling/application/decide-leave.ts`
- Create: `api-skinlab/src/modules/scheduling/domain/rescheduling-contact-task.ts`
- Create: `api-skinlab/src/modules/scheduling/application/list-rescheduling-contact-tasks.ts`
- Create: `api-skinlab/src/modules/scheduling/application/get-doctor-availability.ts`
- Create: `api-skinlab/src/modules/scheduling/infrastructure/prisma-availability-repository.ts`
- Create: `api-skinlab/src/modules/scheduling/application/leave-request.test.ts`
- Create: `admin-skinlab/src/features/doctor-leave/**`

**Interfaces:**

- Consumes: Identity roles, audit, clinic timezone, scheduled jobs.
- Produces: `requestLeave(command): Promise<LeaveRequest>`; `previewLeaveImpact(command): Promise<LeaveImpactPreview>`; `decideLeave(command): Promise<LeaveDecisionResult>` containing affected appointments and created rescheduling-contact tasks; `getDoctorAvailability(query): Promise<AvailabilityWindow[]>`.

- [ ] **Step 1: Write failing leave-policy tests**

Cover following-week request submitted Monday–Friday, late request rejection, admin approval/rejection, emergency admin leave with reason, pre-approval conflict preview, affected appointment preservation, owned contact-task creation, and SLA assignment: two working hours for in-hours approval, before 10:00 next working day for after-hours approval, and immediate urgency under 24 hours.

- [ ] **Step 2: Run scheduling tests**

Run: `pnpm --filter @skinlab/api test -- leave-request.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement base schedule and leave exceptions**

Base availability is 09:00–19:00; approved leave subtracts unavailable windows without deleting existing appointments.

- [ ] **Step 4: Add doctor request and admin decision screens**

Show pending, approved, rejected, and emergency leave with affected-appointment counts before approval. After approval show contact-task owner, deadline, attempt history, unresolved age, urgency, and escalation.

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

Test two concurrent bookings, approved leave conflict, start/end ordering, requested-doctor preference, reschedule history link, cancellation reason, rejection of past/out-of-hours operational booking at the application boundary, and separation of authorized audited backfill/migration from normal scheduling.

- [ ] **Step 2: Run appointment integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- schedule-appointment.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement appointment aggregate and database conflict protection**

Use transactional conflict checks plus a PostgreSQL exclusion/locking strategy that prevents overlapping doctor segments under concurrency. Validate clinic-local operating date/time on every command; UI input limits are not trusted as enforcement.

- [ ] **Step 4: Implement rescheduling tasks after leave approval**

Changing to a replacement appointment preserves the original status/reason and contact history.

- [ ] **Step 5: Add reception calendar UI**

Show the active operating date; default creation to it; reject past/out-of-hours values before submission; and display both date and time for cross-date records. Show both doctors, patient time, doctor segments, requested/assigned doctor, conflict explanation, and replacement link.

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
- Create: `api-skinlab/src/modules/scheduling/application/get-end-of-day-exceptions.ts`
- Create: `api-skinlab/src/modules/scheduling/application/check-in-patient.test.ts`
- Create: `api-skinlab/src/modules/scheduling/jobs/no-show-jobs.integration.test.ts`
- Create: `admin-skinlab/src/features/check-in/**`

**Interfaces:**

- Consumes: Appointment, clinic timezone, job runner, audit, and the effective `SchedulingPolicy` from Task 2.
- Produces: `checkInPatient(command): Promise<CheckInResult>` with `ON_TIME | LATE`; `recordContactAttempt(command): Promise<ContactAttempt>`; `getEndOfDayExceptions(date): Promise<ActiveDayException[]>`; idempotent jobs for T−10 and the 19:00 no-show sweep. Final operational day closure is a separate authorized workflow.

- [ ] **Step 1: Write failing boundary tests**

Cover before appointment, exactly at appointment, T+14:59, T+15:00, a changed grace-policy value, patient-reported delay, duplicate contact job, checked-in reminder suppression, cancelled/rescheduled/final-state reminder suppression, no-show rerun, and preservation/listing of checked-in, waiting, and in-progress end-of-day exceptions.

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @skinlab/api test -- check-in-patient.test.ts && pnpm --filter @skinlab/api test:integration -- no-show-jobs.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement check-in and contact records**

Late arrival releases priority but does not cancel the appointment. Contact outcomes are `NOT_CONTACTED`, `AWAITING_RESPONSE`, `CONFIRMED`, or `RESCHEDULE_REQUESTED`. The 19:00 sweep changes only eligible unarrived `BOOKED` appointments and never represents final day closure.

- [ ] **Step 4: Implement scheduled reminders and no-show closure**

Jobs query by clinic-local time and remain safe on retry. T−10 creates a contact task only for an active booked appointment that has not checked in; cancelled, rescheduled, no-show, completed, and already checked-in records are excluded. The 19:00 sweep preserves active patient work and feeds a separate owned exception list for final closure.

- [ ] **Step 5: Add reception check-in/contact UI**

Show due reminders, last contact attempt, grace-period countdown, and explicit late/no-show status. Before T+15 an absent booking has no warning; from T+15 use `Chưa check-in — mất ưu tiên`, reserving `Đến muộn — mất ưu tiên` for actual late check-in. Suppress grace/late labels for in-progress, completed, cancelled, no-show, and needs-rescheduling states. Show owned end-of-day active exceptions separately.

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
- Produces: `proposeWalkInOptions(command): Promise<WalkInOption[]>`; `enqueueWalkIn(command): Promise<QueueEntry>`; explicit `acceptSubstitute(commandWithCustomerAgreement): Promise<QueueEntry>`; option reasons `SAFE_GAP`, `ALTERNATE_DOCTOR`, `WAIT_NEXT_GAP`, `BOOK_LATER`, `CLINICAL_REVIEW_REQUIRED`. Each option carries doctor identity, availability, local earliest-safe-start, service minutes, buffer minutes, blocking-work summary, and an explicit permitted action.

- [ ] **Step 1: Write failing hybrid-policy tests**

Cover a walk-in fitting with buffer, crossing buffer by one minute, both doctors busy, primary-doctor preference, no-preference comparison, patient accepting substitute for the current visit without changing course ownership, refusal to substitute, clinician-marked priority, doctor-labelled explanation fields, and an effective policy version with a changed `safeGapBufferMinutes` value altering the proposed option.

- [ ] **Step 2: Run queue tests**

Run: `pnpm --filter @skinlab/api test -- propose-walk-in-options.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement safe-gap calculation**

Reception cannot independently mark clinical urgency; only an authorized doctor decision creates `CLINICAL_REVIEW_REQUIRED` priority. A preferred doctor is highlighted without hiding labelled alternatives; no option starts or substitutes silently, and substitute acceptance records customer agreement for this visit only.

- [ ] **Step 4: Add queue UI**

Display checked-in booked patients, late arrivals, walk-ins, in-progress work, and estimated doctor release. Start with a Vietnamese clinic-level conclusion, then compare doctor-labelled options using local date/time, service-duration plus safety-buffer calculation, blocking work, earliest safe start, and explicit start/wait/book-later actions; never expose raw ISO timestamps or implementation reason strings.

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
- Produces: `getDayBoard(date: LocalDate): Promise<DayBoard>` with explicit operating date, doctor-labelled scheduling/queue decisions, rescheduling-task SLA state, and active end-of-day exceptions; plus a production-like E2E workflow.

- [ ] **Step 1: Write the failing E2E journey**

Register patient; reject a past booking; book a requested doctor with visible operating-date context; create a conflicting attempt; demonstrate T+14:59/T+15:00 wording; compare localized safe-gap options; record customer agreement for a one-visit substitute; approve leave and verify contact-task SLA/escalation; reschedule the affected appointment; run the 19:00 no-show sweep while preserving active end-of-day exceptions; verify terminal cards suppress late/grace labels.

- [ ] **Step 2: Run E2E**

Run: `pnpm test:e2e -- appointments-queue.spec.ts`

Expected: FAIL until day-board integration exists.

- [ ] **Step 3: Implement the day-board query and screen**

Keep the read model optimized for the day's workflow without allowing it to bypass module command interfaces. Present terminal-state precedence, operating-date context, local date/time, manual-contact urgency/aging, and the separation between the 19:00 no-show sweep and authorized final day closure.

- [ ] **Step 4: Run the phase quality gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm test:e2e -- appointments-queue.spec.ts && pnpm build`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add api-skinlab/src/modules/scheduling admin-skinlab/src tests/e2e/appointments-queue.spec.ts
git commit -m "feat: deliver appointment and queue vertical slice"
```
