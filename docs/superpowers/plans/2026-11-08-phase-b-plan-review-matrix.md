# Phase B Plan Review Matrix

**Status:** Approved; Phase B complete; Foundation Task 1 authorized on 2026-11-09  
**Review method:** Main-agent self-review plus independent specialist audits

| Plan                           | Proposed approval                | Material review result                                                                                                                                               | Required revalidation                                                                       |
| ------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| A0 Appointment Prototype       | Approved for execution           | Disposable scope, authoritative T+15 boundary, full rule/store interfaces, test-first leave flow, and exact archive/docs handoff verified                            | Verify Foundation Task 1 baseline and SME availability                                      |
| 1 Foundation                   | Approved for execution           | Exact repository migration, server-side OIDC sessions, device/gateway mTLS, fake-data Keycloak LoA 2, staging exporters, pgBackRest recovery, and E2E gates verified | Provisional fake-data choices only; external review still required for real data/production |
| 2 Appointments/Queue           | Roadmap approved                 | Added patient-merge reversal, versioned scheduling policy, reminder suppressions                                                                                     | A0 findings, actual Foundation/job/auth/database interfaces                                 |
| 3 Clinical/Treatment           | Roadmap approved                 | Added negative encounter cases, course origin guard, section permissions, consent prerequisite, migration evidence                                                   | Plans 2/4/5/6 interfaces and Clinical SME review                                            |
| 4 Packages/Payments            | Roadmap approved                 | Added complete receipt replacement semantics and split medicine draft from inventory-gated payment                                                                   | Actual course, inventory, compliance, and usage-guard interfaces                            |
| 5 Inventory                    | Roadmap approved                 | Added deterministic expiry policy and medication reservation before payment                                                                                          | Item master, near-expiry threshold, stocktake concurrency, role workflow                    |
| 6 Compliance/Migration/Go-live | Roadmap approved; external gates | Corrected ADR numbering, paper/image reconciliation, synthetic rehearsal, external technical preflight                                                               | Signed reviewers, ratified production topology, opening inventory, named cutover owners     |

## Independent-audit findings resolved

- Patient merge now has a controlled reversible command, provenance, authorization, UI, and tests.
- Ordinary treatment courses require paid-package activation; only audited legacy migration may create an unbacked course.
- Scheduling timing/buffer values have a versioned owning policy instead of scattered constants.
- Contact reminders exclude checked-in and non-active appointments.
- Encounter start rejects cancelled, rescheduled, and no-show appointments.
- Clinical-image work explicitly depends on effective compliance consent policy.
- Clinical section-level write permissions are testable.
- Medication stock is reserved before funds confirmation/receipt issuance.
- Receipt replacement is fully defined and does not masquerade as refund or transaction reversal.
- Compliance ADR uses the next available number and updates the index.
- Cutover preflight requires external technical evidence as well as compliance evidence.
- Paper records and selected images are covered by migration reconciliation.
- Training/parallel rehearsal is synthetic-only; real-data trial is separately gated.
- Incoming expired lots are rejected; near-expiry acceptance is acknowledged and audited.
- A0 releases late-arrival priority at exactly T+15 and preserves review artifacts before branch handoff.
- Root pnpm release/build policies are migrated before nested workspace metadata is removed.
- OIDC state/nonce/PKCE and refresh tokens remain server-side; browser cookies contain opaque identifiers only.
- WireGuard plus device/Caddy/API mTLS replaces source-IP-only trust in fake staging.
- Keycloak fake staging requires LoA 2/TOTP and `acr=2`; monitoring exporters and pgBackRest files are explicit.

Final independent review record: [`docs/reviews/2026-11-08-phase-b-plan-review.md`](../../reviews/2026-11-08-phase-b-plan-review.md).

## Approval boundary

Product Owner approval confirms that A0 and Foundation meet execution-detail quality and that Plans 2–6 have roadmap approval. The Product Owner subsequently lifted the hold and authorized Foundation Task 1 on 2026-11-09. A0 still depends on Task 1, and Plans 2–6 must pass their stated revalidation gates before execution.
