# SkinLab A0 Appointment Workflow Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a one-week, fake-data appointment workflow prototype that a receptionist and doctor can use to validate SkinLab scheduling, arrival, queue, walk-in, and doctor-leave behavior.

**Architecture:** Use the existing Next.js frontend on an isolated `prototype/a0-appointment` branch after Foundation Task 1 establishes the root monorepo. All A0 behavior is feature-local and in-memory; no production API, database, authentication, or real data is used. Prototype code is tagged and archived but never merged into production application branches; only validated knowledge returns through a separate docs-only pull request.

**Tech Stack:** Existing `admin-skinlab` stack: Next.js 16.4.5, React 19.3.1, TypeScript 7, Tailwind CSS 4, Zustand 5.0.16, next-intl 4.14.9, Vitest 5.1.0, and Testing Library.

**Specs:** `docs/superpowers/specs/2026-11-08-skinlab-system-architecture-design.md` and `docs/superpowers/specs/2026-11-08-skinlab-phase-b-plan-approval-design.md`

**Execution status:** Tasks 1–7 completed and accepted on 2026-11-09. Tag `prototype-a0-accepted` preserves the evidence; durable findings were merged to `dev`, and prototype application code was not merged.

## Global Constraints

- Time box is one development week.
- The objective is workflow learning with a receptionist and doctor, not reusable production code.
- Use fake labels only; no patient identifiers, clinical data, images, payment evidence, or production secrets.
- Display `A0 PROTOTYPE — FAKE DATA — NOT FOR PRODUCTION` on every prototype screen.
- No backend, database, real authentication/MFA, channel integration, or production deployment.
- Clinic hours are 09:00–19:00 with two doctors.
- The late-priority grace period is 15 minutes; priority is released at exactly T+15:00, so T+14:59 remains within grace and T+15:00 is late.
- Cancellation and no-show are distinct; no-show occurs at 19:00 when a booked patient never checked in.
- Protect booked appointments when inserting walk-ins; offer wait/reschedule when no safe gap exists.
- Prefer the primary/requested doctor and offer substitution rather than silently changing doctors.
- Approved doctor leave creates rescheduling work; it does not silently delete appointments.
- Prototype code must not merge into `dev`, `stg`, or `main`.

## Review Focus

- At T+14:59 the patient retains grace priority; at exactly T+15:00 the patient is late and already-waiting patients may move ahead.
- A walk-in whose estimated duration would consume a protected booked slot is offered wait/reschedule, not immediate service.
- If the requested/primary doctor is busy, the UI offers waiting or explicit substitution and never silently reassigns.
- Approved leave overlapping booked appointments marks each one for receptionist rescheduling without deleting it.
- Cancellation remains user/clinic initiated, while no-show is applied only to unarrived booked appointments at 19:00.

---

### Task 1: Isolate the A0 prototype and define fake scheduling data

**Files:**

- Create: `admin-skinlab/src/features/appointment-prototype/README.md`
- Create: `admin-skinlab/src/features/appointment-prototype/model/types.ts`
- Create: `admin-skinlab/src/features/appointment-prototype/model/fixtures.ts`
- Create: `admin-skinlab/src/features/appointment-prototype/model/fixtures.test.ts`
- Create: `admin-skinlab/src/app/prototype/appointments/page.tsx`
- Modify: `admin-skinlab/src/messages/vi.json`
- Modify: `admin-skinlab/src/messages/en.json`

**Interfaces:**

- Consumes: Foundation Task 1 root monorepo, `dev` baseline, existing Next.js/i18n/test conventions.
- Produces: `DoctorId = "doctor-1" | "doctor-2"`; `AppointmentStatus = "booked" | "checked_in" | "waiting" | "in_progress" | "completed" | "cancelled" | "no_show" | "needs_reschedule"`; `PrototypeDoctor`; `PrototypeAppointment`; `PrototypeLeave`; `createA0Fixtures(): A0FixtureSet`.

- [ ] **Step 1: Create the isolated prototype branch**

From the verified `dev` baseline run `git switch -c prototype/a0-appointment`. Record the baseline commit. Stop if the working tree is not clean.

- [ ] **Step 2: Write the fixture contract test**

Create `fixtures.test.ts` with test `creates_fake_two_doctor_day_without_sensitive_fields`. Assert two doctors, clinic hours `09:00`–`19:00`, booked/walk-in examples, and absence of phone, email, address, diagnosis, and clinical-image fields.

- [ ] **Step 3: Run the fixture test and verify failure**

Run: `pnpm --filter @skinlab/admin-web test -- src/features/appointment-prototype/model/fixtures.test.ts`

Expected: FAIL because prototype types and fixtures do not exist.

- [ ] **Step 4: Define the feature-local types and fake fixtures**

Use stable fake labels such as `BN-001`; store times as ISO strings in `Asia/Ho_Chi_Minh`. Add the prototype README with purpose, exclusions, disposal rule, and the exact `NOT FOR PRODUCTION` warning.

- [ ] **Step 5: Add the guarded prototype route**

Create `/prototype/appointments` with the warning banner and a placeholder that renders only fixture counts. Do not add navigation from the normal application home page.

- [ ] **Step 6: Run focused and frontend gates**

Run: `pnpm --filter @skinlab/admin-web test -- appointment-prototype && pnpm --filter @skinlab/admin-web typecheck && pnpm --filter @skinlab/admin-web lint`

Expected: PASS with zero real-data fields in the fixture contract.

- [ ] **Step 7: Commit**

```bash
git add admin-skinlab/src/features/appointment-prototype admin-skinlab/src/app/prototype/appointments admin-skinlab/src/messages
git commit -m "prototype(a0): add isolated fake scheduling model"
```

### Task 2: Implement arrival classification and waiting-order rules

**Files:**

- Create: `admin-skinlab/src/features/appointment-prototype/rules/classify-arrival.ts`
- Create: `admin-skinlab/src/features/appointment-prototype/rules/classify-arrival.test.ts`
- Create: `admin-skinlab/src/features/appointment-prototype/rules/rank-waiting-entries.ts`
- Create: `admin-skinlab/src/features/appointment-prototype/rules/rank-waiting-entries.test.ts`

**Interfaces:**

- Consumes: `PrototypeAppointment` from Task 1.
- Produces: `classifyArrival(input: { scheduledStart: string; checkedInAt: string; graceMinutes: number }): "on_time" | "within_grace" | "late"`, where elapsed minutes `>= graceMinutes` is late; `rankWaitingEntries(input: { now: string; appointments: PrototypeAppointment[] }): PrototypeAppointment[]`.

- [ ] **Step 1: Write boundary and queue-order tests**

Add tests `keeps_priority_at_fourteen_minutes_fifty_nine_seconds`, `releases_priority_at_exactly_fifteen_minutes`, `marks_late_after_fifteen_minutes`, and `places_already_waiting_patient_before_late_arrival`. Assert deterministic tie-breaking by `checkedInAt` then appointment ID.

- [ ] **Step 2: Run the rule tests and verify failure**

Run: `pnpm --filter @skinlab/admin-web test -- appointment-prototype/rules`

Expected: FAIL because the functions do not exist.

- [ ] **Step 3: Implement the pure arrival and ranking functions**

Keep rules independent of React, browser time, and mutable global state. Require the caller to pass `now` and timestamps explicitly.

- [ ] **Step 4: Run the rule tests**

Run: `pnpm --filter @skinlab/admin-web test -- appointment-prototype/rules`

Expected: PASS with priority retained at T+14:59, released at T+15:00, and already-waiting patients ranked ahead of a late arrival.

- [ ] **Step 5: Commit**

```bash
git add admin-skinlab/src/features/appointment-prototype/rules
git commit -m "prototype(a0): model late arrival and queue priority"
```

### Task 3: Implement safe-gap and doctor-choice proposals

**Files:**

- Create: `admin-skinlab/src/features/appointment-prototype/rules/propose-walk-in-options.ts`
- Create: `admin-skinlab/src/features/appointment-prototype/rules/propose-walk-in-options.test.ts`
- Create: `admin-skinlab/src/features/appointment-prototype/rules/propose-doctor-options.ts`
- Create: `admin-skinlab/src/features/appointment-prototype/rules/propose-doctor-options.test.ts`

**Interfaces:**

- Consumes: doctor/appointment fixtures and explicit `now`, service duration, protected booked starts, and requested/primary doctor.
- Produces: `WalkInProposalInput = { now: string; estimatedDurationMinutes: number; safetyBufferMinutes: number; doctors: PrototypeDoctor[]; appointments: PrototypeAppointment[] }`; `WalkInProposal = { kind: "start_now" | "wait_until" | "reschedule"; doctorId?: DoctorId; availableAt?: string; reason: string }`; `proposeWalkInOptions(input: WalkInProposalInput): WalkInProposal[]`; `DoctorProposalInput = { now: string; estimatedDurationMinutes: number; requestedDoctorId?: DoctorId; primaryDoctorId?: DoctorId; doctors: PrototypeDoctor[]; appointments: PrototypeAppointment[] }`; `DoctorProposal = { kind: "primary" | "substitute" | "wait"; doctorId?: DoctorId; availableAt?: string }`; `proposeDoctorOptions(input: DoctorProposalInput): DoctorProposal[]`.

- [ ] **Step 1: Write safe-gap and explicit-substitution tests**

Add tests `does_not_consume_protected_booked_slot`, `offers_start_now_only_when_estimated_service_fits`, `prefers_primary_doctor`, and `offers_substitute_without_silent_reassignment`.

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter @skinlab/admin-web test -- propose-walk-in-options propose-doctor-options`

Expected: FAIL because proposal functions do not exist.

- [ ] **Step 3: Implement proposal functions**

Use the service-duration fixture and a configurable prototype buffer. Return choices/reasons for receptionist discussion; do not claim the heuristic is the final production scheduling algorithm.

- [ ] **Step 4: Run proposal tests**

Run: `pnpm --filter @skinlab/admin-web test -- appointment-prototype/rules`

Expected: PASS with no immediate-start proposal when a booked slot is endangered.

- [ ] **Step 5: Commit**

```bash
git add admin-skinlab/src/features/appointment-prototype/rules
git commit -m "prototype(a0): propose safe walk-in and doctor options"
```

### Task 4: Build the interactive receptionist day board

**Files:**

- Create: `admin-skinlab/src/features/appointment-prototype/store/use-a0-appointment-store.ts`
- Create: `admin-skinlab/src/features/appointment-prototype/store/use-a0-appointment-store.test.ts`
- Create: `admin-skinlab/src/features/appointment-prototype/components/prototype-banner.tsx`
- Create: `admin-skinlab/src/features/appointment-prototype/components/day-board.tsx`
- Create: `admin-skinlab/src/features/appointment-prototype/components/doctor-column.tsx`
- Create: `admin-skinlab/src/features/appointment-prototype/components/appointment-card.tsx`
- Create: `admin-skinlab/src/features/appointment-prototype/components/create-appointment-dialog.tsx`
- Create: `admin-skinlab/src/features/appointment-prototype/components/walk-in-dialog.tsx`
- Create: `admin-skinlab/src/features/appointment-prototype/components/day-board.test.tsx`
- Modify: `admin-skinlab/src/app/prototype/appointments/page.tsx`

**Interfaces:**

- Consumes: Tasks 1–3 model and rules; existing Button, Input, Dialog, Tailwind, and Zustand conventions.
- Produces: `A0AppointmentStore { now: string; appointments: PrototypeAppointment[]; leaves: PrototypeLeave[]; createBookedAppointment(input: CreateBookedAppointmentInput): string; registerWalkIn(input: RegisterWalkInInput): string; checkIn(input: { appointmentId: string; checkedInAt: string }): void; startService(input: { appointmentId: string; doctorId: DoctorId }): void; completeService(input: { appointmentId: string; completedAt: string }): void; cancelAppointment(input: { appointmentId: string; reason: string }): void; advanceClock(now: string): void; resetFixtures(): void }`; interactive two-doctor day board. Command types are declared in the store file and contain only fake patient labels, timestamps, duration, and requested/primary doctor IDs.

- [ ] **Step 1: Write failing store transition tests**

Test valid transitions from booked to checked-in/waiting/in-progress/completed, cancellation distinct from no-show, rejection of impossible transitions, and `resetFixtures` restoring the fake baseline.

- [ ] **Step 2: Run store tests and verify failure**

Run: `pnpm --filter @skinlab/admin-web test -- use-a0-appointment-store.test.ts`

Expected: FAIL because the store does not exist.

- [ ] **Step 3: Implement the feature-local in-memory store**

Do not call `apiFetch`, localStorage, cookies, or a backend. Inject the prototype clock through `advanceClock` so reviewers can demonstrate late/no-show behavior without waiting.

- [ ] **Step 4: Write failing day-board interaction tests**

Test creating a booked appointment, adding a walk-in, checking in, displaying late priority, choosing a substitute explicitly, progressing a visit, and resetting the demo.

- [ ] **Step 5: Implement the day-board components**

Show clinic time, two doctor columns, status/arrival labels, safe-gap proposal reasons, and explicit action buttons. Keep all labels understandable to receptionist/doctor reviewers and show the warning banner persistently.

- [ ] **Step 6: Run focused UI tests and accessibility queries**

Run: `pnpm --filter @skinlab/admin-web test -- appointment-prototype/components appointment-prototype/store`

Expected: PASS using role/name queries for all primary actions.

- [ ] **Step 7: Commit**

```bash
git add admin-skinlab/src/features/appointment-prototype admin-skinlab/src/app/prototype/appointments
git commit -m "prototype(a0): add interactive receptionist day board"
```

### Task 5: Demonstrate doctor leave, rescheduling work, and end-of-day no-show

**Files:**

- Create: `admin-skinlab/src/features/appointment-prototype/rules/apply-doctor-leave.ts`
- Create: `admin-skinlab/src/features/appointment-prototype/rules/apply-doctor-leave.test.ts`
- Create: `admin-skinlab/src/features/appointment-prototype/rules/mark-end-of-day-no-shows.ts`
- Create: `admin-skinlab/src/features/appointment-prototype/rules/mark-end-of-day-no-shows.test.ts`
- Create: `admin-skinlab/src/features/appointment-prototype/components/doctor-leave-dialog.tsx`
- Create: `admin-skinlab/src/features/appointment-prototype/components/rescheduling-list.tsx`
- Create: `admin-skinlab/src/features/appointment-prototype/components/doctor-leave-flow.test.tsx`
- Modify: `admin-skinlab/src/features/appointment-prototype/components/day-board.tsx`
- Modify: `admin-skinlab/src/features/appointment-prototype/store/use-a0-appointment-store.ts`

**Interfaces:**

- Consumes: appointment store and fixture types.
- Produces: `applyApprovedLeave(input: { leave: PrototypeLeave; appointments: PrototypeAppointment[] }): { appointments: PrototypeAppointment[]; reschedulingAppointmentIds: string[] }`; `markEndOfDayNoShows(input: { now: string; appointments: PrototypeAppointment[] }): PrototypeAppointment[]`; store actions `approveLeave(input: { leave: PrototypeLeave }): void` and `closeBusinessDay(input: { now: string }): void`.

- [ ] **Step 1: Write leave and no-show rule tests**

Add tests `marks_overlapping_appointments_for_rescheduling_without_deletion`, `does_not_change_non_overlapping_appointments`, `marks_only_unarrived_bookings_no_show_at_1900`, and `keeps_cancelled_distinct_from_no_show`.

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm --filter @skinlab/admin-web test -- apply-doctor-leave mark-end-of-day-no-shows`

Expected: FAIL because the rules do not exist.

- [ ] **Step 3: Implement rules and store actions**

Leave approval changes affected appointments to `needs_reschedule` and preserves original schedule/doctor fields. End-of-day handling acts only when prototype time reaches 19:00.

- [ ] **Step 4: Write and run the failing leave-flow interaction test**

Test that approving leave through the dialog preserves the appointment, changes it to `needs_reschedule`, and displays it in the receptionist action list; also test closing the day at 19:00 marks only an unarrived booking as `no_show`.

Run: `pnpm --filter @skinlab/admin-web test -- doctor-leave-flow.test.tsx`

Expected: FAIL because the leave dialog and rescheduling list are not implemented.

- [ ] **Step 5: Add leave and rescheduling UI**

Show affected appointments in a receptionist action list with fake contact-needed indicators. Do not simulate automatic Zalo/Messenger/Telegram contact.

- [ ] **Step 6: Run the feature gate**

Run: `pnpm --filter @skinlab/admin-web lint && pnpm --filter @skinlab/admin-web typecheck && pnpm --filter @skinlab/admin-web test -- appointment-prototype && pnpm --filter @skinlab/admin-web build`

Expected: all commands exit 0 and the prototype route builds.

- [ ] **Step 7: Commit**

```bash
git add admin-skinlab/src/features/appointment-prototype
git commit -m "prototype(a0): demonstrate leave rescheduling and no-show"
```

### Task 6: Run receptionist/doctor review and preserve durable knowledge

**Files:**

- Create: `docs/reviews/a0-appointment-prototype-review.md`
- Create: `docs/product/a0-appointment-workflow.md`
- Create: `docs/product/a0-appointment-acceptance-scenarios.md`
- Modify if decisions change: `docs/superpowers/specs/2026-11-08-skinlab-system-architecture-design.md`
- Modify: `docs/superpowers/plans/2026-11-08-02-appointments-queue.md`

**Interfaces:**

- Consumes: A0 prototype build, Global Constraints, Review Focus scenarios, Business SME, Clinical SME, Product Owner.
- Produces: signed review record; durable workflow/state decisions; accepted/rejected findings; production-plan revalidation inputs.

- [ ] **Step 1: Prepare a fixed review script**

Include scenarios for booked appointment, walk-in with/without safe gap, exact/over-15-minute arrival, primary-doctor wait/substitute, approved leave, cancellation, and 19:00 no-show. Record the prototype commit and state that all displayed data is fake.

- [ ] **Step 2: Facilitate the SME review**

Have the receptionist operate the day board and the doctor evaluate doctor-choice/leave behavior. Record observations verbatim as findings; do not silently change requirements during the session.

- [ ] **Step 3: Classify every finding**

For each finding record `accepted`, `rejected`, or `needs decision`; owner; affected rule/plan; and evidence. Product Owner resolves every `needs decision` item before closing A0.

- [ ] **Step 4: Write durable workflow and acceptance documents**

Document validated states, transitions, priority rules, exceptions, unresolved production questions, and screenshots/recording references. Update the System Design only for Product Owner-approved behavior changes.

- [ ] **Step 5: Revalidate the production Appointments plan**

Update Plan 2 assumptions, test scenarios, and revalidation notes from accepted A0 findings. Do not copy prototype component/store implementation into the production plan merely because it exists.

- [ ] **Step 6: Record Product Owner acceptance of A0 learning outcomes**

Acceptance means the questions were answered and findings preserved; it does not mean prototype code is production-ready.

- [ ] **Step 7: Commit the accepted review artifacts on the prototype branch**

Run `git status --short`, stage only the review, product, approved spec, and revalidated Plan 2 files listed in this task, then commit them with `git commit -m "docs(a0): preserve appointment workflow findings"`. Verify the prototype branch is clean before Task 7. This commit makes the reviewed code and its exact acceptance evidence taggable together.

### Task 7: Archive prototype code without merging it into production paths

**Files:**

- Create on `dev` through a docs-only branch: the accepted Task 6 documentation files
- Do not merge: `admin-skinlab/src/features/appointment-prototype/**`
- Do not merge: `admin-skinlab/src/app/prototype/appointments/**`

**Interfaces:**

- Consumes: accepted Task 6 review and clean prototype branch.
- Produces: immutable tag `prototype-a0-accepted`; archived prototype branch; docs-only PR to `dev`; disposition record for any proposed code reuse.

- [ ] **Step 1: Run the final prototype evidence gate**

Run: `pnpm --filter @skinlab/admin-web lint && pnpm --filter @skinlab/admin-web typecheck && pnpm --filter @skinlab/admin-web test -- appointment-prototype && pnpm --filter @skinlab/admin-web build`

Expected: all commands exit 0; attach output to the review record.

- [ ] **Step 2: Tag the reviewed prototype commit**

Create annotated tag `prototype-a0-accepted` containing the review-record path and Product Owner acceptance date. Push the prototype branch and tag for archival; do not open a merge PR for prototype code.

- [ ] **Step 3: Return to `dev` and create a docs-only branch**

Create `docs/a0-appointment-findings` from updated `dev`. Restore only the accepted documentation paths from the tagged Task 6 commit:

```bash
git restore --source prototype-a0-accepted -- \
  docs/reviews/a0-appointment-prototype-review.md \
  docs/product/a0-appointment-workflow.md \
  docs/product/a0-appointment-acceptance-scenarios.md \
  docs/superpowers/plans/2026-11-08-02-appointments-queue.md \
  docs/superpowers/specs/2026-11-08-skinlab-system-architecture-design.md
```

Do not cherry-pick prototype commits or copy prototype application files. Review `git diff --name-only` before committing and stop if any path is outside `docs/`; an unchanged System Design path produces no diff.

- [ ] **Step 4: Review and merge the docs-only PR**

Verify the diff contains documentation only, links the archived prototype commit/tag, and updates Plan 2 only with validated knowledge. Run Markdown/internal-link checks and merge through the normal `dev` PR gate.

- [ ] **Step 5: Record code disposition**

For any prototype fragment proposed for reuse, create a new production Issue requiring tests, security review, and the normal Definition of Done. Default disposition is `reference only — reimplement`.
