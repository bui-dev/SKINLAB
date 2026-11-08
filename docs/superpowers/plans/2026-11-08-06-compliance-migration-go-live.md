# Compliance, Migration, and Go-Live Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the approved design into a legally reviewed, reconciled, trained, recoverable, and controlled production rollout while paper remains authoritative until the compliance gate permits replacement.

**Architecture:** Compliance decisions become versioned operational requirements and automated controls. Migration uses idempotent staging/import jobs with reconciliation reports; cutover uses explicit go/no-go and rollback runbooks rather than ad-hoc production entry.

**Tech Stack:** Approved pnpm monorepo, Markdown/ADR/runbook documents, NestJS migration module, PostgreSQL staging schema, private object storage, Vitest/Testcontainers, Playwright, infrastructure restore scripts.

**Spec:** `docs/superpowers/specs/2026-11-08-skinlab-system-architecture-design.md`

**Phase B approval:** Roadmap approved on 2026-11-08; not authorized for execution because external gates remain blocked and revalidation is required. Revalidate signed compliance decisions, external technical reviewer/evidence, ratified production topology, actual opening-data inventory, migration rehearsal, RTO/RPO evidence, and named cutover/rollback owners.

## Global Constraints

- Compliance review starts during foundation work and blocks production, not planning or development with synthetic/controlled data.
- Paper remains the legally authoritative record until the clinic has documented confirmation that the electronic record may replace it.
- Cutover migrates future appointments, active courses, purchased packages/remaining entitlement, primary doctors, actionable prescriptions, stock by lot/expiry, selected clinical images, and legacy paper records in scope.
- Completed historical appointments, receipts, and stock movements need not be recreated unless compliance review requires them.
- Migration is rehearsed, idempotent, auditable, and reconciled before production import.
- RTO 4 hours and RPO 15 minutes must be demonstrated by a restore drill before go-live.

## Review Focus

- No production launch may proceed with an unsigned compliance decision, failed restore drill, unresolved critical permission finding, or unreconciled opening balance.
- Re-running an import batch must update/report the same source records without duplicating patients, appointments, courses, entitlement, receipts, or stock.
- A rollback after partial cutover must identify which paper and electronic entries are authoritative and prevent double entry.
- Migrated clinical records must preserve source date/provenance and must not appear historically electronically signed.
- Production support must revoke access immediately without deleting audit history or clinical ownership records.

---

### Task 1: Establish the compliance requirements register and production gate

**Files:**

- Create: `docs/compliance/requirements-register.md`
- Create: `docs/compliance/data-processing-map.md`
- Create: `docs/compliance/consent-register.md`
- Create: `docs/compliance/retention-register.md`
- Create: `docs/compliance/production-gate.md`
- Create: `docs/adr/0004-paper-authority-until-compliance-gate.md`
- Modify: `docs/adr/README.md`
- Create: `docs/templates/compliance-decision-record.md`

**Interfaces:**

- Consumes: Approved design, clinic legal/licensing facts, qualified Vietnam legal/compliance review.
- Produces: Signed decisions for signature method, consent text, retention, audit retention, data residency, image handling, disclosure/export, breach response, and paper/electronic authority; gate status `OPEN | BLOCKED | APPROVED`.

- [ ] **Step 1: Create the requirements register with evidence fields**

Each row requires requirement, authority/source, applicable clinic process, system control, operational control, owner, evidence, review date, and status. Do not put unresolved values into code.

- [ ] **Step 2: Map every collected data type and purpose**

Include patient identity, health history, clinical record, images, prescriptions, payments, transfer evidence, audit logs, access metadata, and backups.

- [ ] **Step 3: Obtain and record qualified review decisions**

The clinic owner and qualified reviewer sign decision records. Record the paper-authority decision as ADR-0004 and add it to the ADR index. If a requirement changes the approved architecture, stop that implementation area and update the design/ADR before continuing.

- [ ] **Step 4: Define the machine-checkable production gate manifest**

Create `docs/compliance/production-gate.md` with exact evidence paths and pass/fail owner. An `APPROVED` gate requires every mandatory decision and control test.

- [ ] **Step 5: Commit**

```bash
git add docs/compliance docs/adr docs/templates
git commit -m "docs: establish compliance and paper-authority gate"
```

### Task 2: Convert approved compliance decisions into product controls

**Files:**

- Create: `packages/contracts/src/compliance.ts`
- Create: `api-skinlab/src/modules/compliance/domain/compliance-policy.ts`
- Create: `api-skinlab/src/modules/compliance/application/get-effective-policy.ts`
- Create: `api-skinlab/src/modules/compliance/application/assert-processing-allowed.ts`
- Create: `api-skinlab/src/modules/compliance/infrastructure/versioned-policy-repository.ts`
- Create: `api-skinlab/src/modules/compliance/compliance.module.ts`
- Create: `api-skinlab/src/modules/compliance/application/compliance-policy.test.ts`
- Create: `api-skinlab/src/modules/compliance/application/retention-enforcement.integration.test.ts`

**Interfaces:**

- Consumes: Signed compliance decision records from Task 1.
- Produces: versioned `CompliancePolicy`; `assertProcessingAllowed(purpose, dataClass, consentContext)`; retention/export/restriction commands defined by the approved register.

- [ ] **Step 1: Write failing policy-version tests from approved decisions**

Cover effective dates, no retroactive silent policy mutation, missing required consent, revoked consent behavior, legally retained clinical record, and role-authorized export.

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @skinlab/api test -- compliance-policy.test.ts && pnpm --filter @skinlab/api test:integration -- retention-enforcement.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement versioned policy and enforcement ports**

Clinical/media/commercial modules call the policy interface; they do not parse Markdown or legal documents at runtime.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm --filter @skinlab/api test -- modules/compliance && pnpm --filter @skinlab/api test:integration -- modules/compliance`

Expected: PASS against the signed policy fixture.

```bash
git add packages/contracts/src/compliance.ts api-skinlab/src/modules/compliance
git commit -m "feat(compliance): enforce approved data policies"
```

### Task 3: Build idempotent operational opening-data migration

**Files:**

- Create: `packages/contracts/src/migration.ts`
- Create: `api-skinlab/src/modules/migration/domain/migration-batch.ts`
- Create: `api-skinlab/src/modules/migration/application/stage-opening-data.ts`
- Create: `api-skinlab/src/modules/migration/application/validate-opening-data.ts`
- Create: `api-skinlab/src/modules/migration/application/import-opening-data.ts`
- Create: `api-skinlab/src/modules/migration/application/reconcile-migration.ts`
- Create: `api-skinlab/src/modules/migration/infrastructure/prisma-migration-repository.ts`
- Create: `api-skinlab/src/modules/migration/migration.module.ts`
- Create: `api-skinlab/src/modules/migration/application/opening-data-migration.integration.test.ts`
- Create: `tools/migration/templates/*.csv`
- Create: `tools/migration/README.md`

**Interfaces:**

- Consumes: Patient, scheduling, clinical, commercial, and inventory application interfaces; Plan 03 migration-only `importPreCommercialCourse(command, context: MigrationImportContext, provenance: LegacyCourseProvenance)` and `getClinicalMigrationEvidence(batchId)`; source rows/files with stable `sourceSystem + sourceId`.
- Produces: `stageOpeningData`; `validateOpeningData`; `importOpeningData`; `reconcileMigration`; batch/result/error reports including paper-record and selected-clinical-image evidence.

- [ ] **Step 1: Write failing idempotency and reconciliation tests**

Cover duplicate source row, patient duplicate candidate, future appointment, active course/primary doctor, purchased-package balance, actionable prescription, lot/expiry opening stock, paper-record source/target evidence, selected-image source/target/provenance evidence, second run, and partial failure rollback.

- [ ] **Step 2: Run integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- opening-data-migration.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement staging and validation without domain-table writes**

Produce actionable row errors and totals. Validation must complete before import is allowed.

- [ ] **Step 4: Implement import through module application interfaces**

Never write domain tables directly. For active legacy courses, construct the exact Plan 03 `MigrationImportContext` (`batchId`, `sourceSystem`, `sourceId`, `importedBy`, `importedAt`, `permission="migration:import"`) and `LegacyCourseProvenance` (`originalStartDate`, `sourceReference`) and call its migration-only import interface. Store source mapping, batch, importer, time, and provenance.

- [ ] **Step 5: Implement reconciliation report**

Compare source/target counts and sums for patients, future appointments, active courses, remaining service entitlement, prescriptions, base-unit stock per lot, paper records by confirmation state, and selected clinical images by provenance/authorization state. Any unexplained count or provenance mismatch blocks approval.

- [ ] **Step 6: Run tests and commit**

Run: `pnpm --filter @skinlab/api test:integration -- modules/migration && pnpm --filter @skinlab/api typecheck`

Expected: PASS.

```bash
git add packages/contracts/src/migration.ts api-skinlab/src/modules/migration tools/migration
git commit -m "feat(migration): add idempotent opening data import"
```

### Task 4: Rehearse migration and produce owner-approved opening balances

**Files:**

- Create: `docs/migration/rehearsal-runbook.md`
- Create: `docs/migration/reconciliation-template.md`
- Create: `docs/migration/exception-log-template.md`
- Create: `tools/migration/run-rehearsal.sh`
- Test: `tools/migration/run-rehearsal.test.sh`

**Interfaces:**

- Consumes: Migration module and sanitized copy of clinic opening data.
- Produces: rehearsal batch ID, reconciliation report, unresolved exception list, measured duration, signed owner approval.

- [ ] **Step 1: Write a failing rehearsal acceptance script**

The script must reset a disposable environment, run stage/validate/import/reconcile twice, and prove identical target state on the second run.

- [ ] **Step 2: Run rehearsal test**

Run: `bash tools/migration/run-rehearsal.test.sh`

Expected: FAIL until orchestration exists.

- [ ] **Step 3: Implement rehearsal orchestration and evidence output**

Never use production secrets. Store reports outside public web paths.

- [ ] **Step 4: Conduct rehearsal with clinic representatives**

Reception validates appointments/stock; doctors validate active courses/clinical provenance; admin validates completeness and signs the reconciliation report.

- [ ] **Step 5: Commit reusable scripts and blank evidence templates only**

Do not commit patient data or completed evidence containing personal information.

```bash
git add docs/migration tools/migration
git commit -m "ops: add migration rehearsal and reconciliation"
```

### Task 5: Complete security, privacy, recovery, and permission acceptance

**Files:**

- Create: `tests/e2e/production-readiness.spec.ts`
- Create: `docker/scripts/production-readiness-check.sh`
- Create: `docs/security/permission-matrix.md`
- Create: `docs/security/privacy-review.md`
- Create: `docs/operations/restore-evidence-template.md`

**Interfaces:**

- Consumes: All implemented modules, compliance policy, access gateway, backup/restore, production-like environment.
- Produces: signed permission matrix, privacy findings, RTO/RPO evidence, production-readiness report.

- [ ] **Step 1: Write failing production-readiness E2E checks**

Cover every role and sensitive action, remote/clinic access, MFA, image/payment evidence, audit, account revocation, backup restore, and paper-fallback back-entry label.

- [ ] **Step 2: Run readiness checks**

Run: `bash docker/scripts/production-readiness-check.sh --environment staging`

Expected: FAIL until all evidence and controls exist.

- [ ] **Step 3: Fix critical/high findings through owning plan tasks**

Do not waive critical findings. Record accepted lower-risk findings with owner, reason, compensating control, and review date.

- [ ] **Step 4: Run restore drill and full readiness suite**

Run: `bash docker/scripts/restore-drill.sh --environment staging && pnpm test:e2e -- production-readiness.spec.ts`

Expected: restore within RTO 4 hours/RPO 15 minutes and all E2E checks pass.

- [ ] **Step 5: Commit tests and blank review artifacts**

```bash
git add tests/e2e/production-readiness.spec.ts docker/scripts/production-readiness-check.sh docs/security docs/operations
git commit -m "test: add production readiness gate"
```

### Task 6: Train users and run a synthetic controlled parallel rehearsal

**Files:**

- Create: `docs/training/reception.md`
- Create: `docs/training/doctor.md`
- Create: `docs/training/admin.md`
- Create: `docs/training/scenario-checklist.md`
- Create: `docs/operations/parallel-trial.md`
- Create: `docs/operations/issue-triage.md`

**Interfaces:**

- Consumes: Staging environment, synthetic training data only, paper-authority rule.
- Produces: completed role training, scenario evidence, issue log, owner decision to proceed/extend trial.

- [ ] **Step 1: Write role-specific training from actual screens**

Cover normal and exception workflows: late/no-show, doctor leave, record amendment, package payment, material return, stock variance, outage paper entry, and access revocation.

- [ ] **Step 2: Run scripted scenarios with each role**

Use the checklist and record only defects/workflow observations, never embed patient data in the repository.

- [ ] **Step 3: Conduct a synthetic parallel rehearsal while paper remains authoritative**

Set start/end dates, daily reconciliation owner, defect severity policy, and stop criteria. Do not enter real patient data. A later real-data trial is a separate controlled activity requiring external technical approval, approved compliance gate, real-data access authorization, applicable consent, and written stop criteria.

- [ ] **Step 4: Resolve blocking issues and repeat failed scenarios**

Require fresh evidence; do not mark training complete from verbal confirmation alone.

- [ ] **Step 5: Commit training/runbook improvements**

```bash
git add docs/training docs/operations/parallel-trial.md docs/operations/issue-triage.md
git commit -m "docs: add role training and parallel trial"
```

### Task 7: Execute controlled cutover with rollback criteria

**Files:**

- Create: `docs/operations/cutover-runbook.md`
- Create: `docs/operations/rollback-runbook.md`
- Create: `docs/operations/go-no-go-checklist.md`
- Create: `docker/scripts/cutover-preflight.sh`
- Test: `docker/tests/cutover-preflight.test.sh`

**Interfaces:**

- Consumes: Approved compliance gate, signed external technical approval evidence, migration reconciliation, readiness evidence, user training, and incident contacts.
- Produces: go/no-go decision, production migration batch, reconciliation, activation time, rollback authority.

- [ ] **Step 1: Write failing preflight test**

The test must fail on missing/expired external technical approval, blocked compliance, stale backup, failed restore evidence, unresolved critical defect, incomplete training, failed migration rehearsal, or unreconciled opening data including paper-record/selected-image evidence.

- [ ] **Step 2: Run preflight in staging**

Run: `bash docker/tests/cutover-preflight.test.sh`

Expected: FAIL until all gate evidence is supplied.

- [ ] **Step 3: Implement preflight and runbooks**

Define cutover freeze, final exports/counts, import order, smoke tests, decision owners, paper/electronic authority, rollback trigger, and communication path.

- [ ] **Step 4: Execute production cutover only after signed go decision**

Run final backup, import, reconciliation, permission smoke tests, and clinic acceptance. Preserve all evidence outside source control where it contains personal data.

- [ ] **Step 5: Exercise rollback if any stop criterion occurs**

Rollback must state which records created during the cutover window remain authoritative and how they are reconciled before retry.

- [ ] **Step 6: Commit reusable automation and blank runbooks**

```bash
git add docs/operations docker/scripts/cutover-preflight.sh docker/tests/cutover-preflight.test.sh
git commit -m "ops: add controlled cutover and rollback gate"
```

### Task 8: Run post-go-live stabilization and close the implementation program

**Files:**

- Create: `docs/operations/hypercare.md`
- Create: `docs/operations/post-go-live-review.md`
- Create: `docs/operations/known-issues.md`

**Interfaces:**

- Consumes: Production monitoring, support tickets, audit, reconciliation, backup/restore evidence.
- Produces: daily hypercare review, resolved critical issues, accepted backlog, post-go-live decision.

- [ ] **Step 1: Define hypercare metrics and escalation**

Track failed logins, authorization denials, job failures, booking conflicts, unfinished inventory reconciliation, receipt cancellation attempts, migration corrections, backup status, and user-blocking defects.

- [ ] **Step 2: Review daily during the agreed stabilization window**

Assign owner and severity; use systematic debugging for defects and verification-before-completion before closure.

- [ ] **Step 3: Reconcile clinic operations at the end of hypercare**

Confirm appointment outcomes, active course balances, receipt sequence, stock, unresolved amendments, and paper/electronic authority.

- [ ] **Step 4: Run final quality and recovery gates**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm test:e2e && pnpm build && bash docker/scripts/restore-drill.sh --environment production-drill`

Expected: all software checks pass and recovery evidence meets RTO/RPO.

- [ ] **Step 5: Commit reusable review templates**

```bash
git add docs/operations
git commit -m "docs: add hypercare and post-go-live review"
```
