# Phase B Design-to-Plan Traceability Matrix

**Status:** Approved; Phase B and Foundation Task 1 complete  
**Source baseline:** Approved System/Architecture Design and Governance

| Approved outcome / invariant                                  | Owning plan and task             | Planned evidence                                      | Approval note                                          |
| ------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------- | ------------------------------------------------------ |
| Fresh root monorepo, new remote, protected promotion branches | Plan 1 Task 1                    | workspace gate, remote/rules evidence                 | Complete 2026-11-09                                    |
| Individual identity, MFA, clinic/remote context               | Plan 1 Task 4                    | authorization matrix and E2E                          | Provisional for fake data; external ratification later |
| Immutable audit/idempotent writes                             | Plan 1 Task 5                    | integration tests                                     | Execute                                                |
| Private objects and short-lived access                        | Plan 1 Task 6                    | media-access integration tests                        | Execute with fake objects                              |
| RTO 4h / RPO 15m recovery practice                            | Plan 1 Task 8; Plan 6 Tasks 5/7  | restore evidence and cutover gate                     | Production gate remains open                           |
| Validate scheduling workflow before production implementation | A0 Tasks 1–7                     | SME review, durable workflow docs, archived prototype | Disposable code                                        |
| Patient duplicate warning, merge, controlled reversal         | Plan 2 Task 1                    | merge/reversal integration tests and audit            | Revalidate before execution                            |
| Versioned service duration and configurable scheduling policy | Plan 2 Task 2                    | policy/duration unit tests                            | Revalidate A0 values                                   |
| Doctor availability and approved leave                        | Plan 2 Task 3                    | leave tests                                           | Roadmap approved                                       |
| Conflict-safe appointment and rescheduling links              | Plan 2 Task 4                    | concurrent booking integration test                   | Roadmap approved                                       |
| T−10 contact, 15-minute grace, 19:00 no-show                  | Plan 2 Task 5                    | boundary/job tests                                    | Revalidate after A0                                    |
| Protected hybrid walk-in policy                               | Plan 2 Task 6                    | safe-gap tests                                        | Revalidate after A0                                    |
| Reception day board                                           | Plan 2 Task 7                    | scheduling E2E                                        | Revalidate UI findings                                 |
| Reception history input and doctor confirmation               | Plan 3 Task 1                    | confirmation invalidation tests                       | Roadmap approved                                       |
| One encounter per appointment; walk-in encounter allowed      | Plan 3 Task 2                    | identity and negative-status tests                    | Roadmap approved                                       |
| One paid package creates one course                           | Plan 3 Task 3 + Plan 4 Task 4    | unique package/course and atomic activation tests     | Unbacked normal course prohibited                      |
| Fixed session entitlement; doctor may redistribute services   | Plan 3 Task 3 + Plan 4 Tasks 2/5 | plan-version and entitlement tests                    | Roadmap approved                                       |
| Eight clinical sections with section-level roles              | Plan 3 Task 4                    | authorization/locking tests                           | Clinical SME revalidation required                     |
| Completed clinical record immutable; additive amendments      | Plan 3 Task 4                    | concurrent completion/amendment tests                 | Roadmap approved                                       |
| Prescription creation does not deduct stock                   | Plan 3 Task 5                    | prescription tests                                    | Roadmap approved                                       |
| Doctor-only clinical images with effective consent policy     | Plan 3 Task 6 + Plan 6 Tasks 1–2 | privacy/policy tests                                  | Compliance prerequisite                                |
| Manual paper migration with provenance and split confirmation | Plan 3 Task 7 + Plan 6 Tasks 3–4 | provenance and reconciliation evidence                | Paper remains authoritative                            |
| Fixed/versioned package catalog                               | Plan 4 Task 1                    | package-version tests                                 | Roadmap approved                                       |
| Purchased snapshot and append-only entitlement ledger         | Plan 4 Task 2                    | concurrency/limit tests                               | Roadmap approved                                       |
| Full cash/transfer payment with private evidence              | Plan 4 Task 3                    | payment integration tests                             | Roadmap approved                                       |
| Immutable internal receipt; correction-and-replacement only   | Plan 4 Task 4 + Plan 5 Task 6    | replacement/usage-guard tests                         | No refund or transaction reversal                      |
| Entitlement consumed at clinical completion                   | Plan 4 Task 5                    | cross-module transaction tests                        | Revalidate actual Plan 3 interfaces                    |
| Medicine cannot be paid unless stock is reserved              | Plan 4 Task 6 + Plan 5 Task 6    | reservation-before-payment tests                      | Cross-plan interleave required                         |
| Item units/conversions/lots/expiry and non-negative stock     | Plan 5 Task 1                    | unit/balance tests                                    | Roadmap approved                                       |
| Stock receipt only after physical arrival                     | Plan 5 Task 2                    | confirmed receipt tests                               | Expired rejected; near-expiry acknowledged             |
| Treatment expected/issued/used/returned                       | Plan 5 Tasks 3–4                 | allocation/reconciliation tests                       | Roadmap approved                                       |
| FEFO, quarantine, recall, traceability                        | Plan 5 Task 5                    | selection/trace tests                                 | Roadmap approved                                       |
| Prescription dispensing consumes reserved stock once          | Plan 5 Task 6                    | cross-module integration test                         | Roadmap approved                                       |
| Daily/weekly/monthly reconciliation and approved variance     | Plan 5 Task 7                    | stocktake snapshot/approval tests                     | Revalidate with reception/admin                        |
| Qualified compliance decisions block production               | Plan 6 Tasks 1–2                 | signed register and policy tests                      | External gate                                          |
| Opening-state migration includes active operational data      | Plan 6 Tasks 3–4                 | idempotent import/reconciliation                      | External/data gate                                     |
| Security/recovery readiness                                   | Plan 6 Task 5                    | readiness E2E and restore                             | External technical approval required                   |
| Training without repository patient data                      | Plan 6 Task 6                    | synthetic rehearsal evidence                          | Real-data trial is separate gated activity             |
| Controlled go/no-go, cutover, rollback                        | Plan 6 Task 7                    | preflight including technical/compliance evidence     | Production gate                                        |
| Hypercare and closure                                         | Plan 6 Task 8                    | post-go-live review                                   | After production only                                  |

## Coverage conclusion

Every approved MVP outcome has an owning plan/task. Items intentionally outside the MVP remain absent. Later plans retain revalidation or external gates where current repository state, compliance evidence, or production topology is not yet available.
