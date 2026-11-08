# Delivery and Quality Policy

## Cadence

### A0

- Duration: one week.
- Outcome: Appointment Prototype using fake data.
- Review: receptionist, doctor, and Product Owner.
- Label all mocked behavior in the demonstration and review record.

### After A0

- Two-week sprints.
- Sprint planning on the first working day.
- Short weekly risk/dependency check.
- SME review, Product Owner acceptance, and retrospective on the final working day.
- Reforecast the MVP Internal Pilot after three completed sprints.

## Backlog states

```text
Backlog → Ready → In Progress → In Review → Staging → Accepted → Done
```

- `Blocked`: progress cannot continue; record reason, owner, and next action.
- `Cancelled`: Product Owner has explicitly removed the item; preserve history.

## Definition of Ready

An item is `Ready` only when it has:

- a concise problem and expected value;
- acceptance criteria;
- explicit non-goals;
- dependencies and affected modules;
- data classification (`fake`, `test fixture`, or later approved real data);
- test approach;
- UX or workflow notes when relevant;
- known risks and required reviewers; and
- a size small enough to finish within one sprint.

## Work-in-progress limits

- One item in `In Progress`.
- One additional item may wait in `In Review`.
- Research spikes have a time box and a written conclusion.
- A blocked item may be paused only after its current state and next action are recorded.

## Definition of Done

An item is `Done` only when:

1. Acceptance criteria are demonstrably met.
2. Lint, typecheck, and applicable tests pass.
3. Critical domain behavior has automated tests.
4. An AI reviewer independent of the implementation agent has reviewed the change.
5. No known critical defect or critical security finding remains.
6. Database migrations and rollback/recovery effects are tested when applicable.
7. No secret or real patient data is present.
8. Specifications, ADRs, runbooks, and review evidence are updated.
9. The feature deploys successfully to staging when applicable.
10. The appropriate SME has reviewed affected workflows.
11. The Product Owner records acceptance.

## Pull request evidence

Every PR includes:

- linked Issue;
- acceptance criteria checklist;
- scope and non-goals;
- test commands and actual results;
- screenshots or recordings for user-visible changes when useful;
- migration/security/observability impact;
- AI review summary and unresolved findings;
- documentation/ADR links; and
- rollback or disable strategy for risky changes.

## Defect severity

| Severity | Meaning                                                                                                  | Rule                        |
| -------- | -------------------------------------------------------------------------------------------------------- | --------------------------- |
| Critical | Patient-data exposure, irreversible corruption, authorization bypass, unsafe clinical/financial behavior | Blocks merge/release        |
| High     | Core workflow failure or material data-integrity risk                                                    | Blocks milestone acceptance |
| Medium   | Workaround exists; limited impact                                                                        | Product Owner prioritizes   |
| Low      | Cosmetic or minor usability issue                                                                        | May enter backlog           |

## Review records

Sprint and milestone reviews are stored under `docs/reviews/` once the monorepo is initialized. Each record includes date, build/commit, participants or roles, scenarios, findings, decisions, and follow-up Issues.
