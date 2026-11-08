# SkinLab MVP Implementation Plan Index

**Approved design:** `docs/superpowers/specs/2026-11-08-skinlab-system-architecture-design.md`

**Approved governance:** `docs/superpowers/specs/2026-11-08-skinlab-project-governance-design.md`

**Repository target:** one fresh-root pnpm monorepo at `SKINLAB/` with `admin-skinlab`, `api-skinlab`, `packages`, `docker`, and `docs` as defined by `docs/adr/0001-fresh-root-pnpm-monorepo.md`.

**Governance:** `docs/governance/README.md`

**Phase B design:** `docs/superpowers/specs/2026-11-08-skinlab-phase-b-plan-approval-design.md`

**Phase B status:** Complete and approved on 2026-11-08. The Product Owner lifted the execution hold and authorized Foundation Task 1 on 2026-11-09.

## Plan set

| Order | Plan                                                                                              | Approved status                                                                                   |
| ----: | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
|    A0 | [Appointment Prototype](./2026-11-08-00-appointment-prototype-a0.md)                              | Execution-detail approved; dependency-eligible but not started; disposable code, durable learning |
|     1 | [Foundation, Security, and Infrastructure](./2026-11-08-01-foundation-security-infrastructure.md) | Execution-detail approved; Task 1 complete; Tasks 2–9 not started; fake-data scope                |
|     2 | [Appointments and Queue](./2026-11-08-02-appointments-queue.md)                                   | Roadmap approved; revalidation required after A0/Foundation                                       |
|     3 | [Clinical Records and Treatment Courses](./2026-11-08-03-clinical-records-treatment.md)           | Roadmap approved; revalidation required                                                           |
|     4 | [Packages, Payments, and Receipts](./2026-11-08-04-packages-payments-receipts.md)                 | Roadmap approved; revalidation required                                                           |
|     5 | [Inventory and Stocktake](./2026-11-08-05-inventory-stocktake.md)                                 | Roadmap approved; revalidation required                                                           |
|     6 | [Compliance, Migration, and Go-Live](./2026-11-08-06-compliance-migration-go-live.md)             | Roadmap approved; external gates and revalidation required                                        |

Supporting review artifacts:

- [Design-to-plan traceability](./2026-11-08-phase-b-traceability-matrix.md)
- [Dependency and gate matrix](./2026-11-08-phase-b-dependency-gates.md)
- [Plan review matrix](./2026-11-08-phase-b-plan-review-matrix.md)
- [Phase B approval record](../../governance/PHASE_B_PLAN_APPROVAL.md)
- [Phase B completion record](../../governance/PHASE_B_COMPLETION.md)

## Execution authorization

Foundation Task 1 was authorized and completed on 2026-11-09. The dependency order below remains controlling: A0 is now dependency-eligible but has not started, and later work remains subject to revalidation and external gates.

## Dependency order

```text
Plan 1 Task 1 — repository/workspace bootstrap
├── A0 disposable appointment prototype
│   └── accepted findings revalidate Plan 2
├── Plan 1 remaining secure foundation
└── Plan 6 Tasks 1–2 compliance starts early
    ├── effective policy gates clinical-image work
    └── external gates remain open

Plan 2 production appointments
└── Plan 3 clinical/treatment
    └── Plan 4 Tasks 1–5 packages/payment/entitlement
        ├── Plan 5 Tasks 1–5 inventory foundations
        │   └── Plan 4 Task 6 + Plan 5 Task 6 medicine sale/reservation/dispense
        └── Plan 5 Task 7 reconciliation/stocktake

Plan 6 Tasks 3–8 migration/readiness/cutover
└── execute only after owning plans and mandatory gates
```

Plan 6 is numbered last because it owns final migration/go-live, but Tasks 1–2 begin during Foundation. Plan numbering is not a command to execute every task strictly by file number; the dependency/gate matrix controls cross-plan interleaving.

## Quality gate per plan

Every plan uses test-first tasks, focused commits, module-interface review, and a full phase gate:

```text
lint
→ typecheck
→ unit tests
→ integration tests
→ phase E2E journey
→ production build
```

No plan may bypass the approved design's paper-authority rule, role/privacy boundaries, RTO/RPO, or immutable clinical/financial/inventory history.
