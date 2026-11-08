# Packages, Payments, and Receipts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver fixed versioned service packages, one-package/one-course entitlement ledgers, full cash/transfer package payment, medicine-sale pricing/drafts, and immutable internal receipts; Inventory completes reservation-before-payment medicine fulfillment.

**Architecture:** Catalog owns package definitions; Commercial owns purchased-package snapshots, payment, and receipts; Treatment Courses consumes entitlement through a narrow interface. Media stores transfer evidence but Commercial authorizes access.

**Tech Stack:** Approved pnpm monorepo, NestJS, PostgreSQL/Prisma, Zod contracts, private object storage, Next.js, Vitest/Testcontainers, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-skinlab-system-architecture-design.md`

**Phase B approval:** Roadmap approved on 2026-11-08; not authorized for execution because revalidation remains required. Revalidate against actual Treatment Course interfaces, Inventory medication reservation, receipt replacement/usage guards, effective compliance policy for payment evidence, and the approved no-refund rule.

## Global Constraints

- Packages are fixed and versioned by admin; doctors recommend but never edit price, service quantities, or session count.
- One purchased package creates one treatment course; entitlement is never mixed across packages/courses.
- Full payment is required; no installments, debt, refund, discount, promotion, or electronic tax invoice.
- Accepted methods are cash and bank transfer; transfer reference and optional evidence are private to reception/admin.
- Receipt cancellation is correction-and-replacement only before entitlement consumption or medicine dispensing.
- Chargeable transactions are package purchases and prescribed-medicine sales only.

## Review Focus

- A concurrent double payment confirmation must issue exactly one receipt and activate exactly one purchased package.
- Editing a package catalog entry must never mutate an already purchased package snapshot or entitlement.
- A doctor attempt to exceed service quantity or session count must fail even if the UI is bypassed.
- Receipt cancellation after the first entitlement consumption or medication dispensing must be denied without altering history.
- Transfer evidence must remain inaccessible to doctors and must not be treated as proof until reception confirms funds.

---

### Task 1: Extend catalog with immutable package versions

**Files:**

- Modify: `packages/contracts/src/catalog.ts`
- Create: `api-skinlab/src/modules/catalog/domain/package-version.ts`
- Create: `api-skinlab/src/modules/catalog/application/create-package-version.ts`
- Create: `api-skinlab/src/modules/catalog/application/retire-package-version.ts`
- Create: `api-skinlab/src/modules/catalog/infrastructure/prisma-package-repository.ts`
- Create: `api-skinlab/src/modules/catalog/http/packages.controller.ts`
- Create: `api-skinlab/src/modules/catalog/application/create-package-version.integration.test.ts`
- Create: `admin-skinlab/src/features/package-catalog/**`

**Interfaces:**

- Consumes: Versioned service definitions from Plan 02, admin authorization, audit.
- Produces: `createPackageVersion(command): Promise<PackageVersion>` containing name, fixed price, fixed session count, included service quantities, default session distribution, status `DRAFT | ACTIVE | RETIRED`.

- [ ] **Step 1: Write failing package-version tests**

Cover valid activation, missing service, service quantity/session mismatch, doctor/reception denial, retirement, and modification creating a new version rather than mutating the old one.

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @skinlab/api test:integration -- create-package-version.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement package versions and activation invariants**

Use integer minor currency units and explicit currency `VND`; no floating-point money.

- [ ] **Step 4: Add admin package-catalog UI**

Show version, status, price, fixed sessions, included services, and affected future sales; never offer edit-in-place for active/sold versions.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm --filter @skinlab/api test:integration -- modules/catalog && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

```bash
git add packages/contracts/src/catalog.ts api-skinlab/src/modules/catalog admin-skinlab/src/features/package-catalog
git commit -m "feat(catalog): add immutable package versions"
```

### Task 2: Implement purchased-package snapshots and entitlement ledger

**Files:**

- Create: `packages/contracts/src/commercial.ts`
- Create: `api-skinlab/src/modules/commercial/domain/purchased-package.ts`
- Create: `api-skinlab/src/modules/commercial/domain/entitlement-ledger.ts`
- Create: `api-skinlab/src/modules/commercial/application/create-pending-purchase.ts`
- Create: `api-skinlab/src/modules/commercial/application/reserve-entitlement.ts`
- Create: `api-skinlab/src/modules/commercial/application/consume-entitlement.ts`
- Create: `api-skinlab/src/modules/commercial/application/release-entitlement.ts`
- Create: `api-skinlab/src/modules/commercial/infrastructure/prisma-entitlement-repository.ts`
- Create: `api-skinlab/src/modules/commercial/commercial.module.ts`
- Create: `api-skinlab/src/modules/commercial/application/entitlement-ledger.integration.test.ts`

**Interfaces:**

- Consumes: Patient, active PackageVersion, transaction manager, audit.
- Produces: `createPendingPurchase(command): Promise<PurchasedPackage>`; `reserveEntitlement(command)`; `consumeEntitlement(command)`; `releaseEntitlement(command)`; ledger fields total/reserved/consumed/remaining per service and fixed session count.

- [ ] **Step 1: Write failing entitlement tests**

Cover package snapshot preservation, reserve/release/consume, over-consumption, concurrent consumption, fixed session count, and no cross-package/course sharing.

- [ ] **Step 2: Run integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- entitlement-ledger.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement package snapshot and append-only entitlement entries**

Calculate balances from ledger entries or transactionally maintained projections; retain references to source session/service.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @skinlab/api test:integration -- modules/commercial`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/commercial.ts api-skinlab/src/modules/commercial
git commit -m "feat(commercial): add purchased packages and entitlements"
```

### Task 3: Implement cash/transfer payments and private evidence

**Files:**

- Create: `packages/contracts/src/payments.ts`
- Create: `api-skinlab/src/modules/commercial/domain/payment.ts`
- Create: `api-skinlab/src/modules/commercial/application/start-payment.ts`
- Create: `api-skinlab/src/modules/commercial/application/attach-transfer-evidence.ts`
- Create: `api-skinlab/src/modules/commercial/application/confirm-payment.ts`
- Create: `api-skinlab/src/modules/commercial/infrastructure/prisma-payment-repository.ts`
- Create: `api-skinlab/src/modules/commercial/http/payments.controller.ts`
- Create: `api-skinlab/src/modules/commercial/application/confirm-payment.integration.test.ts`
- Create: `admin-skinlab/src/features/payments/**`

**Interfaces:**

- Consumes: Pending package purchase, media store, reception identity, and transaction manager. A medication-sale payment is accepted only through Plan 05 Task 6 with a valid `MedicationReservationContext`.
- Produces: `startPayment(command): Promise<Payment>`; `attachTransferEvidence(command): Promise<PaymentEvidence>`; internal `confirmPayment(command, tx, prerequisite?: PaymentPrerequisite): Promise<ConfirmedPayment>` used by orchestrated receipt issuance. `confirmPayment` rejects a medication transaction unless `prerequisite` contains a valid active inventory reservation owned by that sale.

- [ ] **Step 1: Write failing payment tests**

Cover cash, transfer without confirmation, optional evidence, invalid amount, doctor evidence-access denial, duplicate confirmation, full-payment-only rule, and rejection of medication confirmation without a matching active inventory reservation prerequisite.

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @skinlab/api test:integration -- confirm-payment.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement payment states**

Use `PENDING`, `AWAITING_CONFIRMATION`, `CONFIRMED`, `CANCELLED`; transfer evidence never changes state automatically.

- [ ] **Step 4: Add reception payment UI**

Show package snapshot, fixed amount, method, transfer reference, private evidence, and explicit funds-received confirmation for package purchase. Do not expose medicine payment confirmation in this task; Plan 05 Task 6 adds it only after reservation succeeds.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm --filter @skinlab/api test:integration -- modules/commercial && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

```bash
git add packages/contracts/src/payments.ts api-skinlab/src/modules/commercial admin-skinlab/src/features/payments
git commit -m "feat(commercial): add full cash and transfer payments"
```

### Task 4: Issue immutable receipts and activate a package atomically

**Files:**

- Create: `packages/contracts/src/receipts.ts`
- Create: `api-skinlab/src/modules/commercial/domain/receipt.ts`
- Create: `api-skinlab/src/modules/commercial/application/confirm-package-purchase.ts`
- Create: `api-skinlab/src/modules/commercial/application/request-receipt-cancellation.ts`
- Create: `api-skinlab/src/modules/commercial/application/decide-receipt-cancellation.ts`
- Create: `api-skinlab/src/modules/commercial/application/replace-receipt.ts`
- Create: `api-skinlab/src/modules/commercial/application/receipt-usage-guard.port.ts`
- Create: `api-skinlab/src/modules/commercial/application/entitlement-receipt-usage.adapter.ts`
- Create: `api-skinlab/src/modules/commercial/infrastructure/prisma-receipt-repository.ts`
- Create: `api-skinlab/src/modules/commercial/http/receipts.controller.ts`
- Create: `api-skinlab/src/modules/commercial/application/confirm-package-purchase.integration.test.ts`
- Create: `api-skinlab/src/modules/commercial/application/replace-receipt.integration.test.ts`
- Create: `admin-skinlab/src/features/receipts/**`

**Interfaces:**

- Consumes: Payment, purchased package, TreatmentCourses `createTreatmentCourseFromPurchasedPackage` port, audit, transaction manager.
- Produces: `confirmPackagePurchase(command): Promise<{ payment, receipt, purchasedPackage, treatmentCourse }>`; `requestReceiptCancellation`; `decideReceiptCancellation`; `replaceReceipt(command): Promise<{ originalReceipt, replacementReceipt }>`; `ReceiptUsageGuardPort.assertReplacementAllowed(receiptId): Promise<void>`.

- [ ] **Step 1: Write failing atomicity tests**

Cover successful cash/transfer confirmation, course-creation failure rolling back payment/receipt/activation, concurrent retries issuing one receipt, exact snapshot fields, replacement before use, blocked replacement after entitlement consumption, immutable original, and a single linked replacement chain.

- [ ] **Step 2: Run integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- confirm-package-purchase.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement atomic purchase confirmation**

Generate a unique human-readable receipt number inside the transaction; activate one purchased package and create exactly one treatment course.

- [ ] **Step 4: Implement correction-and-replacement safeguards**

Reception requests and admin approves correction-and-replacement. `ReceiptUsageGuardPort` denies the operation after package entitlement consumption or medicine dispensing. On approval, preserve the original receipt as `REPLACED`, append reason/approver/replacement reference, and issue one immutable replacement from the same confirmed payment and underlying transaction. Replacement does not refund, reverse payment, deactivate a package/course, cancel a medication sale, or release reserved medicine.

- [ ] **Step 5: Add printable internal receipt UI**

Include clinic identity, patient, package snapshot, amount, method, collector, time, status, and replacement reference; label it internal receipt rather than electronic tax invoice.

- [ ] **Step 6: Run tests and commit**

Run: `pnpm --filter @skinlab/api test:integration -- modules/commercial && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

```bash
git add packages/contracts/src/receipts.ts api-skinlab/src/modules/commercial admin-skinlab/src/features/receipts
git commit -m "feat(commercial): issue immutable receipts and activate packages"
```

### Task 5: Connect treatment-session planning and completion to entitlement

**Files:**

- Modify: `api-skinlab/src/modules/treatment-courses/application/revise-treatment-plan.ts`
- Modify: `api-skinlab/src/modules/clinical-records/application/complete-clinical-record.ts`
- Create: `api-skinlab/src/modules/treatment-courses/application/commercial-entitlement.port.ts`
- Create: `api-skinlab/src/modules/commercial/application/treatment-entitlement.adapter.ts`
- Create: `api-skinlab/src/modules/commercial/application/treatment-entitlement.integration.test.ts`
- Modify: `admin-skinlab/src/features/clinical-record/**`

**Interfaces:**

- Consumes: `reserveEntitlement`, `releaseEntitlement`, `consumeEntitlement` from Task 2; treatment session services from Plan 03.
- Produces: `CommercialEntitlementPort.reserveForPlan`, `.releaseForCancelledSession`, `.consumeForCompletedSession`.

- [ ] **Step 1: Write failing cross-module tests**

Cover plan reorder within entitlement, attempted extra service/session, cancellation release, clinical completion consuming once, retry, and record completion rollback if entitlement cannot be consumed.

- [ ] **Step 2: Run integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- treatment-entitlement.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement the narrow entitlement adapter**

Treatment modules call the port; they never query or write commercial tables directly.

- [ ] **Step 4: Show remaining entitlement in doctor UI**

Display read-only total/reserved/consumed/remaining and explain rejected out-of-package changes.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm --filter @skinlab/api test:integration -- modules/commercial modules/treatment-courses modules/clinical-records && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

```bash
git add api-skinlab/src/modules admin-skinlab/src/features/clinical-record
git commit -m "feat(commercial): enforce treatment entitlement"
```

### Task 6: Add versioned medicine prices and prescribed-medicine sale drafts

**Files:**

- Create: `packages/contracts/src/medication-prices.ts`
- Create: `packages/contracts/src/medication-sales.ts`
- Create: `api-skinlab/src/modules/commercial/domain/medication-price-version.ts`
- Create: `api-skinlab/src/modules/commercial/domain/medication-sale.ts`
- Create: `api-skinlab/src/modules/commercial/application/set-medication-price.ts`
- Create: `api-skinlab/src/modules/commercial/application/create-medication-sale.ts`
- Create: `api-skinlab/src/modules/commercial/application/medication-sale.test.ts`
- Create: `admin-skinlab/src/features/medication-sales/**`

**Interfaces:**

- Consumes: Active prescription from Plan 03 and admin-managed active price version.
- Produces: `setMedicationPrice(command): Promise<MedicationPriceVersion>`; `createMedicationSale(prescriptionId): Promise<MedicationSaleDraft>` with immutable price snapshot and states `DRAFT | CANCELLED`. Plan 05 Task 6 owns reservation-before-payment, separate receipt issuance, and dispensing integration.

- [ ] **Step 1: Write failing sale tests**

Cover admin-only price versioning, missing active price, prescription-required draft, immutable price snapshot, no arbitrary medication lines, no discount, no automatic stock reduction, duplicate draft request, and unpaid-draft cancellation.

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @skinlab/api test -- medication-sale.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement versioned medicine pricing and sale draft**

Admin changes create a new price version; existing drafts retain their snapshot. Do not confirm payment or issue a receipt until Plan 05 reserves eligible stock.

- [ ] **Step 4: Add reception medication-sale UI**

Show prescription lines and fixed price snapshot. Keep payment/receipt actions unavailable until the Plan 05 reservation adapter is installed.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm --filter @skinlab/api test -- modules/commercial && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

```bash
git add packages/contracts/src/medication-prices.ts packages/contracts/src/medication-sales.ts api-skinlab/src/modules/commercial admin-skinlab/src/features/medication-sales
git commit -m "feat(commercial): add prescribed medicine sales"
```

### Task 7: Verify purchase, entitlement, and receipt journeys end to end

**Files:**

- Create: `tests/e2e/packages-payments-receipts.spec.ts`

**Interfaces:**

- Consumes: Plans 01–03 and all tasks above.
- Produces: Commercial E2E acceptance gate.

- [ ] **Step 1: Write failing E2E journeys**

Admin publishes package, doctor recommends it, reception confirms transfer evidence/payment, receipt is issued, one course is created, doctor reorders services within entitlement, first service consumes entitlement, and later receipt cancellation is denied.

- [ ] **Step 2: Run E2E**

Run: `pnpm test:e2e -- packages-payments-receipts.spec.ts`

Expected: FAIL until all cross-module wiring is complete.

- [ ] **Step 3: Complete only missing commercial adapters**

Do not implement inventory deduction or medicine payment here. A medication sale remains `DRAFT`; Plan 05 Task 6 owns the reservation → payment/receipt → dispensing E2E path.

- [ ] **Step 4: Run the phase quality gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm test:e2e -- packages-payments-receipts.spec.ts && pnpm build`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/packages-payments-receipts.spec.ts admin-skinlab api-skinlab
git commit -m "feat: deliver packages payments and receipts"
```
