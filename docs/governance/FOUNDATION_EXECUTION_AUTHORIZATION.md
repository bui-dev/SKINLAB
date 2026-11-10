# Foundation Execution Authorization

**Status:** Active  
**Authorized:** 2026-11-09  
**Approver:** Product Owner

## Decision

The Product Owner explicitly lifted the Phase B execution hold and authorized work to begin with `Foundation Task 1 — Initialize the fresh root pnpm monorepo`. After Task 1 and A0 completed, the Product Owner separately authorized `Foundation Task 2 — Add the NestJS API composition root and validated configuration` on 2026-11-09, then `Foundation Task 3 — Add PostgreSQL, Prisma, and module-owned transaction support` on 2026-11-10.

## Authorized scope

- Execute Foundation Task 1 using the approved implementation plan.
- Execute Foundation Task 2 using the approved implementation plan and TDD.
- Execute Foundation Task 3 using the approved implementation plan, TDD, PostgreSQL Docker local, and Testcontainers only.
- Remove nested frontend Git metadata only after verifying its clean state and recording its remote and commit.
- Initialize fresh Git history at `SKINLAB/` and establish the local pnpm workspace.
- Use fake data only.

## Boundaries still in force

- A0 is complete; its production code remains excluded from `dev`, while accepted findings are preserved in durable documents.
- Foundation Tasks 2–3 remain fake-data local/staging work and do not authorize Plan 2 production Appointments/Queue.
- Creating/pushing a new remote and configuring branch protections requires the selected empty remote repository to exist.
- Real patient data and production deployment remain prohibited.
- Paper clinical records remain authoritative.
- External technical and compliance approvals remain mandatory before real data or production.
