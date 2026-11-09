# A0 Appointment Workflow Acceptance Scenarios

**Status:** Accepted by Product Owner on 2026-11-09  
**Prototype evidence commit:** `24c28dd1f75277003e0bcd4eb95b8d3c16ba1f65`  
**Scope:** Fake-data appointment and day-of-queue learning only

These scenarios preserve the durable behavior validated by the receptionist, doctor, and Product Owner during A0. They define production-plan expectations, not approval to reuse prototype code.

## AS-01 — Create a booked appointment

**Given** the clinic has two available doctors and fake scheduling data  
**When** reception creates an appointment with a fake patient label, estimated duration, time, and preferred doctor  
**Then** the board shows it under that doctor as `booked` without storing real patient data.

## AS-02 — Insert a walk-in into a safe gap

**Given** a doctor's free interval is long enough for estimated work plus the configured prototype buffer  
**When** reception evaluates a walk-in  
**Then** the system may propose `start_now`, names the doctor, explains why the gap is safe, compares labelled alternatives when no doctor is preferred, and leaves the final selection explicit.

## AS-02A — Reject past operational bookings

**Given** reception uses the normal booking form  
**When** the submitted appointment start is earlier than current clinic time or outside clinic operating hours  
**Then** both UI and backend reject it; an immediate arrival uses walk-in intake, while authorized historical migration/backfill remains a separate audited workflow.

## AS-03 — Protect the next booked appointment

**Given** starting a walk-in now would consume the next booked slot or its safety buffer  
**When** reception evaluates the walk-in  
**Then** the system does not propose immediate service and instead identifies each doctor, the conflict/next protected booking, earliest safe start, and explicit wait or reschedule action.

The explanation starts with a Vietnamese clinic-level conclusion, uses local date/time, and exposes the service-duration plus safety-buffer calculation rather than raw implementation terms or ISO timestamps.

## AS-04 — Preserve priority through T+14:59

**Given** a booked appointment at time T has not exceeded the grace period  
**When** prototype time is T+14:59  
**Then** the booking retains priority.

## AS-05 — Release priority at exactly T+15:00

**Given** a booked appointment reaches the grace boundary  
**When** prototype time is exactly T+15:00  
**Then** the booking is classified late and already-waiting patients may move ahead.

The UI says `Chưa check-in — mất ưu tiên` while the patient remains absent and uses `Đến muộn — mất ưu tiên` only after a late check-in. The active operating date is visible, and cross-date records show both date and time.

## AS-06 — Never silently substitute a doctor

**Given** the requested or primary doctor is busy  
**When** another doctor could serve the patient  
**Then** the interface offers waiting and an explicit substitute choice; substitution requires customer agreement, applies to the current visit only, and does not change permanent treatment-course ownership.

## AS-07 — Preserve appointments affected by approved leave

**Given** approved doctor leave overlaps booked appointments  
**When** the leave is applied  
**Then** affected appointments remain stored with original schedule/doctor information, change to `needs_reschedule`, and create owned manual-contact tasks with the approved SLA, attempt history, aging, and admin escalation.

Admin sees conflicts before approval. First contact is due within two working hours for an in-hours approval, before 10:00 next working day for an after-hours approval, and immediately when the affected appointment is under 24 hours away. Emergency leave requires a reason.

## AS-08 — Keep cancellation separate from no-show

**Given** reception or the clinic explicitly cancels an appointment  
**When** the 19:00 no-show sweep runs  
**Then** the appointment remains `cancelled`, is not reclassified as `no_show`, and displays no grace/late-priority message.

## AS-09 — Mark only unarrived bookings no-show at 19:00

**Given** clinic time reaches 19:00  
**When** the idempotent no-show sweep runs  
**Then** only booked appointments without check-in become `no_show`; checked-in, waiting, in-progress, completed, cancelled, and walk-in records remain unchanged, and non-queue/terminal states suppress grace/late-priority messages.

The 19:00 no-show sweep remains separate from final operational day closure. Active patients appear in an owned exception list and may continue after 19:00; final closure requires resolution or authorized acknowledgement of every active exception.

## AS-10 — Reset the review environment

**Given** reviewers have changed the in-memory prototype state  
**When** reception resets fake data  
**Then** the deterministic two-doctor fixture is restored and no prior review state persists.

## Review evidence

Results, participant details, verbatim observations, screenshots/recordings, and Product Owner dispositions are recorded in [`../reviews/a0-appointment-prototype-review.md`](../reviews/a0-appointment-prototype-review.md).
