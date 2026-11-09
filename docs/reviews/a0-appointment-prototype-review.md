# A0 Appointment Prototype Review Record

**Status:** Accepted by Product Owner — Task 6 complete  
**Prototype branch:** `prototype/a0-appointment`  
**Prototype commit:** `24c28dd1f75277003e0bcd4eb95b8d3c16ba1f65`  
**Route:** `/prototype/appointments`  
**Data classification:** Fake data only  
**Warning:** `A0 PROTOTYPE — FAKE DATA — NOT FOR PRODUCTION`

## Review purpose

Confirm whether the appointment and day-of-queue workflow is understandable and operationally appropriate for one receptionist and two doctors before production Appointments/Queue implementation begins. Acceptance covers learning outcomes and recorded decisions only; it does not approve prototype code for production reuse.

## Participants

| Role                                  | Participant                                                 | Required responsibility                                         | Attendance                            |
| ------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------- |
| Receptionist / Business SME           | Role-based reviewer; personal name not stored in repository | Operate the day board and judge reception workflow              | Present; feedback recorded            |
| Doctor / Clinical SME                 | Role-based reviewer; personal name not stored in repository | Judge doctor preference, substitution, leave, and queue effects | Present; feedback recorded            |
| Product Owner                         | Project owner                                               | Resolve findings and accept/reject A0 learning outcomes         | Present; F-001 through F-007 accepted |
| Facilitator / Engineering Coordinator | Project owner with Codex assistance                         | Run the fixed script and record observations verbatim           | Present                               |

**Review date/time:** 2026-11-09, completed at approximately 15:57 Asia/Ho_Chi_Minh  
**Location/device:** Local A0 worktree through the visible in-app browser  
**Screenshot/recording references:** No recording retained; live observations OBS-001 through OBS-011 used fake labels only

## Technical preflight evidence

Preflight ran on 2026-11-09 (Asia/Ho_Chi_Minh) with Node `22.23.3` and pnpm `12.18.0` against the prototype commit recorded above.

```text
lint: passed
typecheck: passed
tests: 14 files passed, 38 tests passed
production build: passed
built route: /prototype/appointments
```

The initial shell exposed Node 20 and a broken global pnpm switcher. No repository change was made for that workstation issue; the successful gate used the repository-required Node version and `corepack pnpm`.

## Entry gate

- [x] Prototype screens display the fake-data/non-production warning.
- [x] Prototype build succeeds at commit recorded above.
- [x] Automated appointment-prototype tests pass.
- [x] Cancellation and second-level clock controls make every fixed scenario demonstrable.
- [x] Receptionist, doctor, and Product Owner are present or have delegated recorded review authority.
- [x] Review device can open the prototype route.
- [x] No screenshot/recording was retained; the review record contains fake labels only.

## Facilitation rules

1. The receptionist operates the interface; the facilitator does not complete actions on their behalf unless documenting a technical obstruction.
2. The doctor evaluates doctor-choice, substitution, queue, and approved-leave behavior.
3. Reset fake data before each scenario unless the script explicitly continues state.
4. Read the expected outcome only after the reviewer describes what they expect to happen.
5. Record observations verbatim. Do not silently turn feedback into a requirement or code change.
6. Use only fake labels such as `BN-001`; do not enter names, phone numbers, diagnoses, images, or other real data.
7. Every observation becomes a finding or an explicit “no finding” result with evidence.

## Fixed review script

| ID     | Scenario and operator                                                    | Required actions                                                                                      | Expected outcome                                                                                       | Result/evidence                                                                                                 |
| ------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| A0-R01 | Booked appointment — receptionist                                        | Create a fake appointment, select a doctor and duration, then locate it on the board                  | Appointment appears under the selected doctor with booked status and estimated duration                | Creation passed; OBS-001/F-001 found hidden date-context problem                                                |
| A0-R02 | Walk-in with a safe gap — receptionist                                   | Open walk-in intake with a duration that fits before protected work; inspect reasons and add to queue | A `start_now`-compatible reason is shown; receptionist still chooses the doctor/action                 | Queue insertion passed; proposal comprehension failed — OBS-003/F-003                                           |
| A0-R03 | Walk-in without a safe gap — receptionist                                | Use a duration and buffer that would overlap the next booking                                         | No immediate start is offered; wait/reschedule reasoning is visible                                    | Rule produced wait times; explanation comprehension failed — OBS-004/F-004                                      |
| A0-R04 | Late boundary — receptionist                                             | Set clock to `09:44:59` for the `09:30` booking, then to `09:45:00`                                   | At T+14:59 priority remains; at exactly T+15:00 the UI shows loss of priority                          | Passed; OBS-005 confirms comprehension, no new finding                                                          |
| A0-R05 | Primary doctor busy — receptionist and doctor                            | Start one visit with the primary doctor, add/check in another fake patient who prefers that doctor    | UI shows wait and explicit substitute choices; no silent reassignment occurs                           | Passed; OBS-006 confirms customer-agreement rule, no new finding                                                |
| A0-R06 | Progress visit — receptionist                                            | Check in, start with an explicitly selected doctor, then complete                                     | Status progresses through checked-in/waiting, in-progress, and completed                               | Passed; OBS-007 confirms state progression, no new finding                                                      |
| A0-R07 | Approved doctor leave — doctor evaluates, facilitator uses admin control | Approve leave overlapping a booked appointment                                                        | Original appointment remains, becomes `needs_reschedule`, and appears in the manual contact list       | Conflict detection passed; timely-contact control missing — OBS-008/F-005                                       |
| A0-R08 | Cancellation — receptionist                                              | Cancel a fake booked appointment, then close the day                                                  | Status remains `cancelled`; it never becomes `no_show`                                                 | State preservation passed; contradictory late label failed — OBS-009/F-006                                      |
| A0-R09 | End-of-day no-show — receptionist                                        | Leave one booked appointment unarrived and close the day at 19:00                                     | Only unarrived booked appointments become `no_show`; arrived/walk-in/cancelled records remain distinct | No-show selection passed; contradictory label covered by F-006; unresolved active-work decision — OBS-010/F-007 |
| A0-R10 | Reset — receptionist                                                     | Reset fake data after several actions                                                                 | Board returns to the deterministic fake baseline                                                       | Passed; OBS-011 confirms deterministic reset, no new finding                                                    |

## Verbatim observation log

Add one row per observation during the session. Preserve the reviewer's wording in the `Verbatim observation` column.

| Observation ID | Scenario | Reviewer role                           | Verbatim observation                                                                                                                                                                                                                                                                                   | Evidence reference                                                                                                                                                       |
| -------------- | -------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| OBS-001        | A0-R01   | Receptionist / Business SME             | “Tôi đã tạo được lịch. Đã xuất hiện tại bảng đúng với bác sĩ chỉ định. Tạo nhanh, cách tạo đơn giản, trạng thái ‘đã đặt lịch’. Thời gian hiện tại là 14h09, tôi đặt lịch 14h30. Sau khi đặt xong xuất hiện thông báo ‘đến muộn - mất ưu tiên’ hiển thị dạng text, color red. Tôi chưa hiểu logic này.” | Live prototype observation; `BN-004` displayed at 14:30 with late label while the visible simulated clock showed 13:32                                                   |
| OBS-002        | A0-R01   | Product Owner                           | “Hoàn toàn có thể đặt lịch trước với mốc thời gian là trong quá khứ. Ví dụ hôm nay là ngày 09/11/2026, trong form đặt lịch tôi có thể chọn được ngày 08 trở về trước.”                                                                                                                                 | Prototype create-appointment form permits an unrestricted past `datetime-local` value                                                                                    |
| OBS-003        | A0-R02   | Receptionist / Business SME             | “Đề xuất 10h15. Bác sĩ ưu tiên: tôi chọn 3 option đều chỉ có 1 khung giờ đề xuất là 10h15. Tôi không thể phân biệt được, bác sĩ nào có thể nhận ngay, bác sĩ nào đang bị trùng lịch và phải chờ.”                                                                                                      | BN-010 entered the unassigned queue; proposal text lacks doctor identity and changing preferred-doctor selection does not filter or highlight the corresponding proposal |
| OBS-004        | A0-R03   | Receptionist / Business SME             | “Tôi chọn bác sĩ ưu tiên ‘không chỉ định’, hệ thống xuất hiện ‘Starting now would overlap protected work; the next safe gap begins at 2026-11-10T10:15:00+07:00’ và một dòng tương tự với `12:00`. Tôi không hiểu hệ thống đang xử lý gì.”                                                             | At 09:00 with a 120-minute estimate, the rule returned separate 10:15 and 12:00 waits but exposed neither doctor identity nor an operational summary                     |
| OBS-005        | A0-R04   | Receptionist / Business SME             | “9h44:59 - trong thời gian ưu tiên 15p. 9h45:00 - đến muộn mất ưu tiên. Lễ tân hiểu được nội dung.”                                                                                                                                                                                                    | Exact T+14:59 and T+15:00 boundary demonstrated successfully; wording refinement remains covered by accepted F-001                                                       |
| OBS-006        | A0-R05   | Receptionist, Doctor, and Product Owner | “Đủ thông tin để lễ tân xác nhận, bác sĩ 01 đang bận, cho phép đổi sang bác sĩ 02 nếu khách hàng đồng ý.”                                                                                                                                                                                              | Wait/substitute options were understood; Product Owner confirmed substitution is conditional on customer agreement and applies to the current visit only                 |
| OBS-007        | A0-R06   | Receptionist / Business SME             | “Trạng thái đúng.”                                                                                                                                                                                                                                                                                     | Booked visit progressed through check-in, in-progress, and completed without an identified workflow gap                                                                  |
| OBS-008        | A0-R07   | Receptionist / Business SME             | “Thông tin lễ tân tiếp nhận đã đủ để xác nhận cần xác nhận lại lịch. Tuy nhiên nếu liên hệ với khách sát giờ đã đặt lịch thì khách hàng sẽ có trải nghiệm không được vui vẻ, tạo cảm giác không chuyên nghiệp.”                                                                                        | Affected booking was preserved and listed for manual rescheduling, but the prototype has no contact deadline, urgency, aging, or escalation signal                       |
| OBS-009        | A0-R08   | Receptionist / Business SME             | “Sau khi đóng ngày, trạng thái vẫn giữ đã huỷ, nhưng xuất hiện text ‘Đến muộn - mất ưu tiên’.”                                                                                                                                                                                                         | `BN-003` remained cancelled after day close, but the card still rendered an arrival-priority warning derived from time                                                   |
| OBS-010        | A0-R09   | Receptionist / Business SME             | “Bệnh nhân 01 đã checkin, bệnh nhân 03 không đến ‘đến muộn mất ưu tiên’, bệnh nhân 02 đang chờ.”                                                                                                                                                                                                       | At 19:00 only the unarrived booking changed to no-show; checked-in and waiting records remained active, while the no-show card repeated the F-006 contradictory label    |
| OBS-011        | A0-R10   | Product Owner                           | “Đúng.”                                                                                                                                                                                                                                                                                                | Reset restored the documented 09:00 fake baseline and removed review-created state                                                                                       |

## Findings and Product Owner disposition

Allowed dispositions are `accepted`, `rejected`, or `needs decision`. A0 cannot close while any row remains `needs decision`.

| Finding ID | Observation IDs | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Disposition | Owner         | Affected rule/plan                                                                                      | Evidence                                                                                                          | Follow-up                                                                       |
| ---------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| F-001      | OBS-001         | The booking form can use a different calendar date from the fixed simulation date, while appointment cards and the clock summary hide the date. Durable rule: expose the active operating date; default creation to it; display date and time for cross-date records; show no warning before T+15:00; use `Chưa check-in — mất ưu tiên` while absent and reserve `Đến muộn — mất ưu tiên` for a late check-in.                                                                                                                                                                                                                        | accepted    | Product Owner | Appointment date/time display and late-classification presentation; revalidate Plan 2 Tasks 4, 5, and 7 | Prototype clock was `2026-11-10T13:32`; the review booking was visually shown only as `14:30` and classified late | Preserve rule in durable workflow/acceptance documents and revalidate Plan 2    |
| F-002      | OBS-002         | The normal reception form permits creating a new appointment in the past. Durable rule: operational appointment creation rejects a start earlier than current clinic time and validates clinic hours in both UI and backend; historical migration/backfill uses a separate authorized and audited workflow; immediate arrivals use walk-in intake.                                                                                                                                                                                                                                                                                    | accepted    | Product Owner | Appointment command validation and form constraints; revalidate Plan 2 Task 4 and migration boundaries  | Past date selectable in the A0 form                                                                               | Preserve validation and separate-backfill rule in durable documents and Plan 2  |
| F-003      | OBS-003         | Walk-in safe-gap proposals omit the doctor identity and do not respond visibly to the preferred-doctor selection, so reception cannot distinguish `start_now` from a doctor-specific wait/conflict. Durable rule: show doctor-labelled availability, earliest safe start, conflict reason, next protected booking, and explicit actions; no preference shows a comparison, while a preference highlights that doctor without hiding labelled alternatives or silently assigning one; explanations update with duration/preference and use Vietnamese.                                                                                 | accepted    | Product Owner | Walk-in decision presentation and doctor preference; revalidate Plan 2 Tasks 2, 6, and 7                | All three preferred-doctor choices appeared to produce the same unlabelled 10:15 proposal                         | Preserve comparison and explicit-decision rules in durable documents and Plan 2 |
| F-004      | OBS-004         | The no-safe-gap result exposes English implementation terminology and raw ISO timestamps without a clinic-level conclusion or calculation context. Durable rule: first state whether anyone can receive now; then show each named doctor, local date/time, blocking reason, service-duration plus safety-buffer calculation, earliest safe start, and explicit wait/reschedule action in Vietnamese.                                                                                                                                                                                                                                  | accepted    | Product Owner | Safe-gap explanation and localization; revalidate Plan 2 Tasks 2, 6, and 7                              | Reception could not interpret the two returned wait timestamps                                                    | Preserve the explanation contract in durable documents and Plan 2               |
| F-005      | OBS-008         | Approved leave identifies affected appointments but does not ensure patients are contacted promptly, creating a last-minute and unprofessional experience. Durable rule: preview conflicts before approval; on approval preserve the original booking and create owned manual-contact tasks immediately with urgency/deadline, attempt history, unresolved aging, and escalation to admin; emergency leave uses an explicit exception path. SLA: approval during working hours receives first contact within two working hours; after-hours approval before 10:00 next working day; appointments under 24 hours are urgent/immediate. | accepted    | Product Owner | Leave approval and rescheduling workflow; revalidate Plan 2 Tasks 3, 4, and 7                           | Reception had sufficient rescheduling information but no timing control                                           | Preserve SLA and escalation rules in durable documents and Plan 2               |
| F-006      | OBS-009         | A terminal or non-arrival state can still render a derived late-priority warning, producing contradictory information. Durable rule: `booked` shows no warning before T+15 and an absent warning afterward; `checked_in`/`waiting` may show arrival classification while queue-relevant; `in_progress`, `completed`, `cancelled`, `no_show`, and `needs_reschedule` suppress priority/late messages; terminal/non-queue status has display precedence with state-combination tests.                                                                                                                                                   | accepted    | Product Owner | Appointment status presentation and derived priority; revalidate Plan 2 Tasks 5 and 7                   | Cancelled BN-003 also displayed `Đến muộn — mất ưu tiên` after close                                              | Preserve status-precedence rules in durable documents and Plan 2                |
| F-007      | OBS-010         | The prototype conflates the automatic 19:00 no-show sweep with “closing the day” even when checked-in or waiting patients remain active. Durable rule: the 19:00 job only marks eligible unarrived bookings; active patients continue and appear in an end-of-day exception list with owner/next action; final operational closure is separate and requires all active exceptions resolved or explicitly acknowledged. The prototype action label must describe the no-show sweep rather than final closure.                                                                                                                          | accepted    | Product Owner | No-show automation and day-closing semantics; revalidate Plan 2 Tasks 5 and 7                           | BN-001 remained checked-in and BN-002 waiting after the close-day action                                          | Preserve no-show/closure separation in durable documents and Plan 2             |

## Learning-outcome acceptance

- [x] All ten scenarios were run or a documented blocker/waiver was approved by the Product Owner.
- [x] Receptionist feedback was recorded verbatim and classified.
- [x] Doctor feedback was recorded verbatim and classified.
- [x] Every finding has an owner, evidence, affected rule/plan, and final disposition.
- [x] No `needs decision` finding remains.
- [x] Accepted behavior is reflected in the durable workflow and acceptance scenarios.
- [x] Plan 2 was revalidated against accepted findings.
- [x] Screenshot/recording references contain fake data only.
- [x] Product Owner accepts the A0 learning outcomes without representing prototype code as production-ready.

## Product Owner decision

**Decision:** Accepted  
**Accepted/rejected by:** Product Owner  
**Decision date:** 2026-11-09  
**Conditions or notes:** Acceptance covers A0 learning outcomes and durable business decisions only. Prototype code is not production-ready, and this decision does not authorize Plan 2 execution.

## Closure statement

Task 6 is closed with all findings resolved and durable documents/Plan 2 revalidated. A0 proceeds to Task 7 for evidence tagging and archive; prototype application code remains excluded from production merge paths.

## Task 7 archive and code disposition

- Accepted prototype artifacts commit: `00d8c0f53b08bf9d51a022218c2e64a427aa9502`.
- Immutable evidence tag: `prototype-a0-accepted`.
- Archived remote branch: `prototype/a0-appointment`.
- Prototype code disposition: **reference only — reimplement**.
- No prototype component, store, rule implementation, or route is approved for direct production reuse. Any future reuse proposal requires a new production issue, fresh tests, security review, and the normal Definition of Done.
