# Phase B Dependency and Gate Matrix

**Status:** Approved; execution order frozen; Foundation Task 1 complete

**Execution authorization:** The Product Owner lifted the hold on 2026-11-09 and authorized sequence row 1, which is now complete. Row 2 is dependency-eligible but has not started; later rows remain subject to their listed prerequisites and gates.

## Executable order

| Sequence | Work                                                      | Must exist first                                                           | Gate after work                                                                |
| -------: | --------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
|        1 | Plan 1 Task 1: fresh repository/workspace/remote/branches | Phase B approval plus explicit lifting of execution hold                   | Workspace checks and branch protections                                        |
|        2 | A0 Appointment Prototype                                  | Plan 1 Task 1                                                              | SME/Product Owner learning acceptance; prototype code not merged               |
|        3 | Revalidate Plan 2 from A0 findings                        | A0 durable documents                                                       | Updated Plan 2 approval before production implementation                       |
|        4 | Plan 1 Tasks 2–9                                          | Repository bootstrap                                                       | Foundation quality gate; fake-data only                                        |
|        5 | Plan 6 Task 1 compliance register                         | May begin during Foundation                                                | Signed decisions remain required before gated controls                         |
|        6 | Plan 6 Task 2 policy controls                             | Signed Task 1 decisions                                                    | Required before Plan 3 clinical images/legacy images                           |
|        7 | Plan 2 production Appointments/Queue                      | Revalidation + Foundation interfaces                                       | Plan 2 E2E                                                                     |
|        8 | Plan 3 Tasks 1–5                                          | Plan 2 contracts                                                           | Clinical E2E uses migrated/pre-commercial course fixture                       |
|        9 | Plan 3 Task 6 clinical images                             | Plan 6 Tasks 1–2                                                           | Doctor-only privacy and policy evidence                                        |
|       10 | Plan 3 Task 7 legacy clinical migration                   | Plan 6 Tasks 1–2                                                           | Provenance and reconciliation interface                                        |
|       11 | Plan 3 Task 8 clinical E2E                                | Plan 3 Tasks 1–7 and required Plan 6 policy controls                       | Clinical-record journey acceptance with migrated/pre-commercial course fixture |
|       12 | Plan 4 Tasks 1–5                                          | Plan 3 course/session interfaces and clinical E2E                          | Package/payment/entitlement E2E                                                |
|       13 | Plan 5 Tasks 1–5                                          | Foundation + clinical material ports                                       | Inventory core evidence                                                        |
|       14 | Plan 4 Task 6                                             | Prescription and medicine price inputs                                     | Creates unpaid medication-sale draft only                                      |
|       15 | Plan 5 Task 6                                             | Plan 4 sale draft + inventory core                                         | Reserve → pay/receipt → dispense integration                                   |
|       16 | Plan 5 Task 7                                             | All stock movements                                                        | Reconciliation/stocktake E2E                                                   |
|       17 | Plan 6 Tasks 3–4                                          | Owning domain interfaces and opening-data inventory                        | Migration rehearsal and owner reconciliation                                   |
|       18 | Plan 6 Task 5                                             | Ratified topology and implemented controls                                 | Technical/readiness evidence                                                   |
|       19 | Plan 6 Task 6                                             | Stable staging build                                                       | Synthetic training/parallel rehearsal only                                     |
|       20 | Plan 6 Task 7                                             | External technical approval + compliance approval + all readiness evidence | Signed go/no-go                                                                |
|       21 | Plan 6 Task 8                                             | Production launch                                                          | Hypercare closure                                                              |

## External gates

| Gate                              | Blocks                                                                                                 | Evidence required                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Human/external technical approval | Real patient data, real-data trial, production                                                         | Signed architecture/security/operations review with scope and expiry/review date |
| Compliance approval               | Real patient data processing not covered by paper authority, electronic-record replacement, production | Signed requirements/consent/retention/residency/paper-authority decisions        |
| Recovery                          | Production                                                                                             | Successful restore evidence meeting RTO 4h and RPO 15m                           |
| Security/readiness                | Production                                                                                             | No unresolved critical findings; access/audit/secret/backup evidence             |
| UAT/training                      | Production                                                                                             | Role-based scenario evidence and Product Owner acceptance                        |
| Migration reconciliation          | Production                                                                                             | Reconciled opening data including paper/image provenance where selected          |

## Revalidation rule

Before executing a roadmap-approved plan, the Engineering Coordinator compares its paths, interfaces, dependencies, versions, assumptions, and tests with the current repository and accepted upstream outputs. Material changes go through change control; the Product Owner re-approves affected scope. Revalidation never closes an external gate.
