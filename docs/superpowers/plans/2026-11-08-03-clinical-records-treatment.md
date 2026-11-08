# Clinical Records and Treatment Courses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver structured patient history, encounters, treatment courses/sessions, immutable completed records, prescriptions, doctor-only clinical images, and controlled legacy-paper migration.

**Architecture:** Clinical Records owns longitudinal and encounter documentation; Treatment Courses owns primary-doctor continuity, plan versions, sessions, and progress. Media stores bytes but Clinical Records alone authorizes clinical-image association and access.

**Tech Stack:** The approved pnpm monorepo foundation, NestJS modules, PostgreSQL/Prisma, private S3-compatible storage, Next.js, Zod contracts, Vitest/Testcontainers, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-skinlab-system-architecture-design.md`

**Phase B approval:** Roadmap approved on 2026-11-08; not authorized for execution because revalidation remains required. Revalidate against actual Plan 02 contracts, Plan 04 entitlement/course activation, Plan 05 inventory reconciliation, Plan 06 consent/retention decisions, migration provenance, and Clinical SME review.

## Global Constraints

- Reception enters administrative/history information; a doctor must confirm history, underlying conditions, and allergies before treatment completion.
- A scheduled appointment produces at most one encounter; walk-ins may produce an encounter without an appointment.
- Completed clinical content is immutable; corrections are additive amendments.
- Only doctors may add or view clinical images.
- A substitute doctor for one session does not transfer primary treatment-course ownership.
- Clinical completion may precede inventory reconciliation; the session remains `INVENTORY_PENDING` until the inventory plan closes it.
- Paper remains authoritative until the compliance production gate is satisfied.

## Review Focus

- A doctor must not complete treatment when required history/allergy confirmation is absent or stale after a material change.
- Concurrent completion/amendment requests must not overwrite clinical history or produce two current versions.
- A receptionist or admin with a valid login must still be unable to read image bytes or obtain a signed URL.
- An image attached to the wrong patient/session must become hidden through an auditable `ENTERED_IN_ERROR` correction without silent deletion.
- Migrated paper data must never appear as though it was authored and signed electronically on the historical service date.

---

### Task 1: Add longitudinal history, allergy records, and doctor confirmation

**Files:**

- Create: `packages/contracts/src/clinical-history.ts`
- Create: `api-skinlab/src/modules/clinical-records/domain/patient-history.ts`
- Create: `api-skinlab/src/modules/clinical-records/domain/allergy.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/record-patient-reported-history.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/confirm-clinical-history.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/assert-history-confirmed.ts`
- Create: `api-skinlab/src/modules/clinical-records/infrastructure/prisma-history-repository.ts`
- Create: `api-skinlab/src/modules/clinical-records/http/history.controller.ts`
- Create: `api-skinlab/src/modules/clinical-records/clinical-records.module.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/confirm-clinical-history.test.ts`
- Create: `admin-skinlab/src/features/clinical-history/**`

**Interfaces:**

- Consumes: Patient registry, authenticated actor, audit, transaction manager.
- Produces: `recordPatientReportedHistory(command): Promise<HistoryVersion>`; `confirmClinicalHistory(command): Promise<HistoryConfirmation>`; `assertHistoryConfirmed(patientId, asOf): Promise<void>`.

- [ ] **Step 1: Write failing history-safety tests**

Cover reception entry as unconfirmed, doctor confirmation, modified history invalidating the prior confirmation, confirmed/refuted/unconfirmed allergy status, and non-doctor confirmation denial.

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @skinlab/api test -- confirm-clinical-history.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement append-versioned history and confirmations**

Store source (`PATIENT`, `REPRESENTATIVE`, `PAPER_MIGRATION`), recorder, recorded-at, confirmer, confirmed-at, and superseded version.

- [ ] **Step 4: Add reception entry and doctor review UI**

Display unconfirmed safety information prominently; require explicit doctor confirmation instead of implicit page viewing.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @skinlab/api test -- modules/clinical-records && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/clinical-history.ts api-skinlab/src/modules/clinical-records admin-skinlab/src/features/clinical-history
git commit -m "feat(clinical): add confirmed patient history and allergies"
```

### Task 2: Implement encounters and treatment-session identity

**Files:**

- Create: `packages/contracts/src/encounters.ts`
- Create: `api-skinlab/src/modules/clinical-records/domain/encounter.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/start-encounter.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/get-encounter.ts`
- Create: `api-skinlab/src/modules/clinical-records/infrastructure/prisma-encounter-repository.ts`
- Create: `api-skinlab/src/modules/clinical-records/http/encounters.controller.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/start-encounter.integration.test.ts`
- Create: `admin-skinlab/src/features/encounters/**`

**Interfaces:**

- Consumes: Patient, appointment/check-in when present, authenticated doctor.
- Produces: `startEncounter(command: StartEncounterCommand): Promise<Encounter>`; optional `appointmentId`; optional `treatmentSessionId`; unique one-encounter-per-appointment invariant.

- [ ] **Step 1: Write failing encounter identity tests**

Cover booked appointment, walk-in without appointment, duplicate start retry, second encounter for same appointment, doctor versus reception permissions, and rejection for cancelled, rescheduled, and no-show appointments.

- [ ] **Step 2: Run integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- start-encounter.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement encounter lifecycle**

States are `IN_PROGRESS`, `CLINICALLY_COMPLETED`, `CANCELLED`; an encounter may later reference one treatment session, while consultation-only encounters remain valid.

- [ ] **Step 4: Add encounter workspace shell**

Show patient safety summary, appointment context, primary/performing doctor, and the eight record sections without implementing completion yet.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @skinlab/api test:integration -- modules/clinical-records && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/encounters.ts api-skinlab/src/modules/clinical-records admin-skinlab/src/features/encounters
git commit -m "feat(clinical): add encounter lifecycle"
```

### Task 3: Implement treatment courses, primary doctor, plan versions, and sessions

**Files:**

- Create: `packages/contracts/src/treatment-courses.ts`
- Create: `api-skinlab/src/modules/treatment-courses/domain/treatment-course.ts`
- Create: `api-skinlab/src/modules/treatment-courses/domain/treatment-plan-version.ts`
- Create: `api-skinlab/src/modules/treatment-courses/domain/treatment-session.ts`
- Create: `api-skinlab/src/modules/treatment-courses/application/create-treatment-course.ts`
- Create: `api-skinlab/src/modules/treatment-courses/application/import-pre-commercial-course.ts`
- Create: `api-skinlab/src/modules/treatment-courses/application/revise-treatment-plan.ts`
- Create: `api-skinlab/src/modules/treatment-courses/application/assign-substitute-doctor.ts`
- Create: `api-skinlab/src/modules/treatment-courses/application/transfer-primary-doctor.ts`
- Create: `api-skinlab/src/modules/treatment-courses/infrastructure/prisma-treatment-course-repository.ts`
- Create: `api-skinlab/src/modules/treatment-courses/treatment-courses.module.ts`
- Create: `api-skinlab/src/modules/treatment-courses/application/revise-treatment-plan.test.ts`
- Create: `admin-skinlab/src/features/treatment-courses/**`

**Interfaces:**

- Consumes: Patient, doctor identities, service definitions, authenticated internal caller context, authorization, and audit. It does not consume a Plan 04 port; Plan 04 calls the course-creation interface produced here.
- Produces: `PackageActivationContext { paymentId, purchasedPackageId, packageVersionId, patientId, actorId, permission: "commercial:activate" }`; internal-only `createTreatmentCourseFromPurchasedPackage(command: CreateCourseFromPurchasedPackageCommand, context: PackageActivationContext): Promise<TreatmentCourse>` with required unique `purchasedPackageId` and origin `PAID_PACKAGE`; `MigrationImportContext { batchId, sourceSystem, sourceId, importedBy, importedAt, permission: "migration:import" }`; `LegacyCourseProvenance { originalStartDate, sourceReference }`; migration-only `importPreCommercialCourse(command: ImportPreCommercialCourseCommand, context: MigrationImportContext, provenance: LegacyCourseProvenance): Promise<TreatmentCourse>` with origin `MIGRATED_PRE_COMMERCIAL`; `reviseTreatmentPlan(command): Promise<TreatmentPlanVersion>`; `assignSubstituteDoctor(sessionId, doctorId, reason)`; `transferPrimaryDoctor(courseId, doctorId, reason)`.

- [ ] **Step 1: Write failing treatment-course tests**

Cover initial version, immutable prior version, reorder/redistribute services, primary doctor preference, one-session substitute, permanent transfer, attempted service/session-count increase rejection, unique one-package/one-course binding, normal unbacked-course rejection, migration-only authorization, and required legacy provenance.

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @skinlab/api test -- revise-treatment-plan.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement course and version invariants**

Make ordinary creation an internal TreatmentCourses application interface callable by the Commercial purchase-confirmation orchestrator only with a valid `PackageActivationContext`; require a unique purchased package. Permit unbacked courses only through the audited migration command with a valid `MigrationImportContext` and `LegacyCourseProvenance`; do not expose it in normal care UI. Keep session count fixed for package-backed courses and preserve author, reason, effective time, and superseded version.

- [ ] **Step 4: Add course timeline and plan-revision UI**

Doctors may reorder permitted services but cannot edit package price or entitlement.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @skinlab/api test -- modules/treatment-courses && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/treatment-courses.ts api-skinlab/src/modules/treatment-courses admin-skinlab/src/features/treatment-courses
git commit -m "feat(treatment): add versioned courses and sessions"
```

### Task 4: Implement the eight-section clinical record, completion, and amendments

**Files:**

- Create: `packages/contracts/src/clinical-records.ts`
- Create: `api-skinlab/src/modules/clinical-records/domain/clinical-record.ts`
- Create: `api-skinlab/src/modules/clinical-records/domain/clinical-amendment.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/save-clinical-draft.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/complete-clinical-record.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/amend-clinical-record.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/complete-clinical-record.integration.test.ts`
- Create: `admin-skinlab/src/features/clinical-record/**`

**Interfaces:**

- Consumes: Encounter, confirmed history, treatment session, audit, transaction manager.
- Produces: `saveClinicalDraft(command): Promise<ClinicalRecordDraft>`; `completeClinicalRecord(command): Promise<CompletedClinicalRecord>`; `amendClinicalRecord(command): Promise<ClinicalAmendment>`.

- [ ] **Step 1: Write failing record-lock tests**

Cover missing history confirmation, free draft editing, successful completion, post-completion edit rejection, additive amendment, concurrent completion, reception write access limited to administrative/history sections, reception denial for examination/diagnosis/progress/prescription/material-use/summary, and admin denial for clinical authoring.

- [ ] **Step 2: Run integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- complete-clinical-record.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement section drafts and atomic completion**

Sections are administrative, history reference, examination, diagnosis/treatment, progress, prescription, material-use declaration, and summary. Enforce section-level commands: reception may update administrative/history input before doctor confirmation; doctors own clinical sections and completion; admin has no clinical-authoring override. Completion records the performing doctor and sets the related treatment session to `INVENTORY_PENDING` when applicable.

- [ ] **Step 4: Implement amendments**

Store target field/section, original reference, corrected content, reason, author, and timestamp; never mutate the completed snapshot.

- [ ] **Step 5: Build doctor record UI**

Show draft/complete/amended status, required safety confirmation, and a read-only original beside amendments.

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @skinlab/api test:integration -- modules/clinical-records && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts/src/clinical-records.ts api-skinlab/src/modules/clinical-records admin-skinlab/src/features/clinical-record
git commit -m "feat(clinical): add locked records and amendments"
```

### Task 5: Implement prescriptions without inventory deduction

**Files:**

- Create: `packages/contracts/src/prescriptions.ts`
- Create: `api-skinlab/src/modules/clinical-records/domain/prescription.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/create-prescription.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/replace-prescription.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/create-prescription.test.ts`
- Create: `admin-skinlab/src/features/prescriptions/**`

**Interfaces:**

- Consumes: Encounter, authenticated doctor, confirmed allergy/history context.
- Produces: `createPrescription(command): Promise<Prescription>`; `replacePrescription(command): Promise<Prescription>`; prescription states `ACTIVE`, `REPLACED`, `CANCELLED`, `DISPENSED` with dispensing performed only by Plan 05 Inventory.

- [ ] **Step 1: Write failing prescription tests**

Cover doctor-only creation, allergy warning acknowledgement, immutable issued prescription, replacement link, and assertion that creation makes no stock movement.

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @skinlab/api test -- create-prescription.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement prescription lifecycle**

Do not automatically substitute unavailable medicine; dispensing is a separate inventory command.

- [ ] **Step 4: Add doctor prescription UI**

Display active allergies and require an explicit reason to proceed when a configured warning is acknowledged.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm --filter @skinlab/api test -- modules/clinical-records && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

```bash
git add packages/contracts/src/prescriptions.ts api-skinlab/src/modules/clinical-records admin-skinlab/src/features/prescriptions
git commit -m "feat(clinical): add immutable prescriptions"
```

### Task 6: Add doctor-only clinical images and correction workflow

**Prerequisite:** Plan 06 Tasks 1–2 must provide an effective signed consent/image policy and `assertProcessingAllowed` port before this task is executable. Fake-data tests may use a policy fixture, but implementers must not invent production consent wording or retention behavior.

**Files:**

- Create: `packages/contracts/src/clinical-images.ts`
- Create: `api-skinlab/src/modules/clinical-records/domain/clinical-image.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/add-clinical-image.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/get-clinical-image-grant.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/mark-image-entered-in-error.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/clinical-image-access.integration.test.ts`
- Create: `admin-skinlab/src/features/clinical-images/**`

**Interfaces:**

- Consumes: Media object store, doctor permission, patient/encounter/session, and Plan 06 `assertProcessingAllowed(purpose, dataClass, consentContext)` with an effective clinical-image consent record.
- Produces: `addClinicalImage(command): Promise<ClinicalImage>`; `getClinicalImageGrant(imageId, doctor): Promise<ShortLivedReadUrl>`; `markImageEnteredInError(command): Promise<ClinicalImageCorrection>`.

- [ ] **Step 1: Write failing privacy tests**

Cover doctor upload/view, receptionist/admin denial, missing consent, wrong patient correction, completed-record immutability, GPS-stripped derivative, and expired read grant.

- [ ] **Step 2: Run media integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- clinical-image-access.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement image metadata and domain authorization**

Require patient, encounter/session, body area, view, category, capture time, upload time, and consent reference. Preserve private original checksum; serve only authorized short-lived derivatives.

- [ ] **Step 4: Add doctor comparison UI**

Group by body area/view and date; never render thumbnails in reception/admin screens.

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @skinlab/api test:integration -- modules/clinical-records && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/clinical-images.ts api-skinlab/src/modules/clinical-records admin-skinlab/src/features/clinical-images
git commit -m "feat(clinical): add doctor-only clinical images"
```

### Task 7: Add controlled paper-record migration

**Files:**

- Create: `packages/contracts/src/clinical-migration.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/import-paper-record.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/import-legacy-clinical-image.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/confirm-migrated-clinical-content.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/confirm-migration-completeness.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/get-clinical-migration-evidence.ts`
- Create: `api-skinlab/src/modules/clinical-records/application/import-paper-record.integration.test.ts`
- Create: `admin-skinlab/src/features/clinical-migration/**`

**Interfaces:**

- Consumes: Patient registry, reception/doctor/admin roles, audit, private media store, and effective Plan 06 policy for any selected legacy image.
- Produces: `importPaperRecord(command): Promise<MigratedRecord>`; `importLegacyClinicalImage(command): Promise<ClinicalImage>` with explicit legacy provenance; separate `clinicalConfirmedAt/by` and `completenessConfirmedAt/by`; `getClinicalMigrationEvidence(batchId): Promise<ClinicalMigrationEvidence>` containing paper/image source counts, target counts, confirmations, and provenance errors.

- [ ] **Step 1: Write failing provenance tests**

Cover original service date versus entry date, source label, reception administrative import, doctor clinical confirmation, admin completeness confirmation, selected legacy image provenance/authorization, source-versus-target evidence counts, and prevention of historical electronic-signature appearance.

- [ ] **Step 2: Run migration tests**

Run: `pnpm --filter @skinlab/api test:integration -- import-paper-record.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement migrated-record workflow**

Use explicit `MIGRATED_FROM_PAPER` provenance on every imported record/version. Selected legacy images require the effective compliance policy, source reference, original capture/service date when known, import date, importing doctor, and private storage; no image is imported merely because a file exists.

- [ ] **Step 4: Add migration work queue UI**

Show missing sections, clinical confirmation status, completeness status, and original paper reference.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm --filter @skinlab/api test:integration -- modules/clinical-records && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

```bash
git add packages/contracts/src/clinical-migration.ts api-skinlab/src/modules/clinical-records admin-skinlab/src/features/clinical-migration
git commit -m "feat(clinical): add paper migration provenance"
```

### Task 8: Verify the clinical-record journey end to end

**Files:**

- Create: `tests/e2e/clinical-records-treatment.spec.ts`

**Interfaces:**

- Consumes: Plans 01–02 and all tasks above.
- Produces: Production-like clinical E2E acceptance gate.

- [ ] **Step 1: Write the failing E2E journey**

Reception records history, doctor confirms it, starts an encounter, imports a clearly labeled `MIGRATED_PRE_COMMERCIAL` course fixture through migration authorization, records eight sections, uploads an image under the approved policy fixture, completes/locks the record without package entitlement consumption, creates an amendment, substitutes a doctor for one later session, and verifies reception/admin cannot view image content. The paid-package course path is exercised only after Plan 04 provides atomic purchase activation and entitlement consumption.

- [ ] **Step 2: Run E2E**

Run: `pnpm test:e2e -- clinical-records-treatment.spec.ts`

Expected: FAIL until all integration paths are wired.

- [ ] **Step 3: Complete only missing cross-module adapters**

Do not create an ordinary unbacked course, consume package entitlement, or deduct inventory in this task; those arrive through the interfaces defined in Plans 04–05.

- [ ] **Step 4: Run the phase quality gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm test:e2e -- clinical-records-treatment.spec.ts && pnpm build`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/clinical-records-treatment.spec.ts admin-skinlab api-skinlab
git commit -m "feat: deliver clinical records and treatment courses"
```
