# SkinLab Phase B — Implementation Plan Review and Approval Design

**Status:** Approved by the Product Owner on 2026-11-08  
**Date:** 2026-11-08  
**Owner:** Product Owner / Engineering Coordinator  
**Prerequisite:** Phase A Project Governance complete

## 1. Intent

Phase B turns the existing implementation-plan drafts into an approved, executable delivery baseline without starting product implementation.

The project already has an approved System/Architecture Design, approved governance, one Foundation plan, five domain/compliance plans, and a plan index. What is missing is:

- a dedicated plan for the one-week A0 Appointment Prototype;
- a formal whole-roadmap review against the approved design and governance;
- an explicit approval level for each plan;
- a distinction between details frozen now and details that must be revalidated later; and
- a Product Owner approval record.

## 2. Goals

1. Create a one-week A0 plan optimized for workflow validation with a receptionist and doctor.
2. Review the complete MVP plan set for coverage, dependency order, feasibility, governance compliance, and production gates.
3. Freeze the detailed A0 and Foundation plans for execution.
4. Approve Plans 2–6 at roadmap level while requiring just-in-time revalidation before their execution.
5. Ensure the Appointment Prototype cannot be mistaken for production-ready software.
6. Produce an auditable Phase B approval record.

## 3. Non-goals

- Writing product code, scaffolding the monorepo, deleting nested Git metadata, or installing dependencies.
- Using real patient data.
- Approving production infrastructure or closing external technical/compliance gates.
- Committing an MVP Internal Pilot date before three delivery sprints provide velocity evidence.
- Treating prototype code as automatically reusable production code.
- Replacing the implementation plans with a high-level roadmap that lacks executable tasks.

## 4. Approaches considered

### A. Approve every task in all plans at once

This provides a fully frozen plan set but creates a large review burden and causes later details to become stale as the solo developer learns backend engineering and the codebase evolves.

### B. Two-level approval — selected

Review the entire roadmap now for scope, dependencies, gates, and feasibility. Freeze A0 and Foundation in executable detail. Approve Plans 2–6 at roadmap level, then revalidate each plan immediately before execution.

This preserves whole-system control while avoiding premature precision.

### C. Approve only the next plan

This starts quickly but risks discovering missing cross-plan dependencies, compliance work, or migration requirements too late.

## 5. Approval levels

Every plan receives exactly one status in the Phase B matrix:

### `Approved for execution`

- Tasks, paths, interfaces, prerequisites, test evidence, and gates are sufficiently precise to start.
- Applies initially to A0 and Foundation.
- Does not override real-data or production restrictions.

### `Roadmap approved — revalidation required`

- Scope, outcomes, dependency position, and major risks are accepted.
- Detailed paths, APIs, estimates, and task breakdown must be checked against the then-current repository before execution.
- Applies initially to Appointments/Queue production implementation, Clinical/Treatment, Packages/Payments, Inventory, and Compliance/Migration/Go-live.

### `Blocked by external gate`

- Work may be designed or tested with fake data, but the gated action cannot occur without required external evidence.
- Examples include real patient data, production go-live, and replacing paper clinical records.

### `Rejected / revision required`

- The plan conflicts with approved design/governance or lacks enough information to approve.
- It returns to revision and independent review.

## 6. A0 Appointment Prototype design constraints

### Purpose

A0 exists to let a receptionist and doctor react to the appointment and day-of-queue workflow before production behavior is implemented.

### Delivery model

- One development week.
- Fake data only.
- Local or fake-data staging only.
- Disposable implementation; production reuse is not assumed.
- Optimize for speed of learning and workflow clarity, not backend depth or production hardening.

### Workflow coverage

A0 should demonstrate:

- create and view a booked appointment;
- record a walk-in;
- display two doctors and estimated service duration;
- check in a patient;
- show waiting and in-progress order;
- apply the 15-minute late-priority rule;
- distinguish cancellation from no-show;
- protect booked appointments when inserting walk-ins;
- show primary-doctor preference and substitution choice;
- show approved doctor leave and appointments requiring rescheduling; and
- show the receptionist's day board.

### Explicit exclusions

- Real authentication/MFA.
- Production API/database.
- Real patient identifiers or clinical data.
- Production concurrency, audit, backup, recovery, monitoring, or legal compliance claims.
- Clinical records, inventory, packages, payments, and receipts.
- Automatic communication-channel integration.

### Durable outputs

Although implementation may be discarded, A0 must preserve:

- approved workflow/state diagram;
- business rules and exceptions;
- acceptance scenarios;
- review participants and evidence;
- screenshots or recordings;
- findings and decisions;
- updated specification/backlog items; and
- a disposition record stating what, if anything, may be reconsidered for production reuse.

### Isolation

The A0 plan must place prototype work under a clearly labeled location such as `prototypes/appointment-a0` or an isolated prototype branch selected during plan writing. It must display `NOT FOR PRODUCTION`, never use real data, and never merge prototype code into production application paths without a new review under the production Definition of Done.

## 7. Foundation approval scope

The Foundation plan is reviewed and frozen in executable detail for:

- fresh-root Git/pnpm monorepo initialization;
- safe removal of nested frontend Git metadata after precondition checks;
- new remote and protected `dev → stg → main` promotion branches;
- workspace packages and preserved frontend verification;
- NestJS composition root and validated configuration;
- PostgreSQL transaction foundation;
- identity/access ADR and fake-data implementation;
- audit/idempotency and private object storage;
- scheduled jobs;
- fake-data staging, backup/restore, and artifact-promotion ADR;
- CI, secret scanning, tests, and build gates; and
- explicit provisional scope for security/deployment decisions that are not ratified for real data/production.

Any provider-specific or production-only choice that lacks evidence remains behind its external gate rather than being invented during Phase B.

## 8. Whole-roadmap review

The review evaluates every plan along these axes:

1. **Design coverage:** each approved MVP behavior appears in a plan and acceptance journey.
2. **Non-goal control:** excluded features do not re-enter through implementation details.
3. **Dependencies:** plan/task order respects required interfaces and data ownership.
4. **Domain invariants:** clinical, entitlement, receipt, and inventory immutability rules are preserved.
5. **Repository consistency:** all paths match ADR-0001.
6. **Governance:** Definition of Ready/Done, ADR, review, branch, and change-control rules are reflected.
7. **Security/privacy:** roles, image privacy, MFA, access context, audit, and secrets are addressed.
8. **Data/recovery:** migrations, fake/real data boundaries, RTO/RPO, backup, and restore are explicit.
9. **Testing:** unit, integration, E2E, UAT, negative, and recovery evidence are proportionate to risk.
10. **Solo feasibility:** tasks are small enough for one developer and avoid unsafe parallel writes.
11. **External gates:** compliance and production actions cannot be silently approved by the plan.
12. **Revalidation triggers:** later plans identify assumptions likely to change before execution.

## 9. Phase B workflow

```text
Inventory existing plans
        ↓
Create A0 plan draft
        ↓
Audit Foundation in executable detail
        ↓
Audit Plans 2–6 at roadmap level
        ↓
Build coverage/dependency/approval matrix
        ↓
Revise plans and index
        ↓
Independent builder review
        ↓
Resolve material findings
        ↓
Product Owner review and approval
        ↓
Publish Phase B approval record
```

No implementation begins before the Phase B approval record is published.

## 10. Responsibilities

### Product Owner

- Confirm A0 workflow scope and exclusions.
- Answer only material business questions that change product behavior.
- Review the plan-set summary, dependencies, risks, and approval statuses.
- Approve or reject A0, Foundation, and the roadmap baseline.
- Preserve external gates rather than accepting them away.

### Engineering Coordinator / planning agent

- Create the A0 implementation plan.
- Audit and revise the complete plan set.
- Produce traceability and approval matrices.
- Identify assumptions, blockers, and revalidation triggers.
- Obtain independent AI builder review and resolve material findings.
- Prepare the approval record.

### Business and Clinical SMEs

- They are not required to read technical implementation plans line by line.
- They review A0 workflows and acceptance scenarios when requested.
- Their formal operational review happens during the A0 sprint.

### External reviewers

- They are not required to close Phase B documentation.
- Their technical/compliance gates remain mandatory before real data or production.

## 11. Deliverables

1. `docs/superpowers/plans/<date>-00-appointment-prototype-a0.md`
2. Revised Foundation plan approved for execution.
3. Revised Plans 2–6 carrying roadmap approval and revalidation notes.
4. Updated MVP plan index including A0 and approval status.
5. A design-to-plan traceability matrix.
6. A dependency and external-gate matrix.
7. Independent review record.
8. `docs/governance/PHASE_B_PLAN_APPROVAL.md` recording Product Owner approval.

Exact filenames may retain the existing date prefix and numbering as long as links and dependency order remain unambiguous.

## 12. Exit criteria

Phase B is complete only when:

- A0 plan is approved for execution;
- Foundation plan is approved for execution;
- Plans 2–6 are roadmap-approved with explicit revalidation triggers;
- design coverage and dependency matrices have no unexplained gaps;
- all material independent-review findings are resolved;
- plan index and repository paths are consistent;
- real-data/production gates remain visible;
- the Product Owner signs the Phase B approval record; and
- no product code or repository migration has started prematurely.

Phase B completion establishes the next candidate execution step defined by the approved plan order. Commencement may be withheld by an explicit Product Owner execution hold, as occurred at approval on 2026-11-08. It does not itself authorize real data or production.

## 13. Approval-time execution hold

At Phase B approval, the Product Owner approved the complete plan baseline but explicitly withheld permission to start `Foundation Task 1 → A0 Appointment Prototype`. The hold is recorded in the approval and completion records and requires a later explicit Product Owner instruction to lift.
