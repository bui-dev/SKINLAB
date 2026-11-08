# Inventory and Stocktake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver traceable stock receipts, units and conversions, lots/expiry, treatment issue-use-return, prescription dispensing, FEFO, daily reconciliation, and approved stocktakes.

**Architecture:** Inventory owns all quantity-changing movements and projections. Clinical/Commercial modules request inventory outcomes through ports; they never edit stock tables. Balances are derived from immutable movements with transactional projections for fast availability checks.

**Tech Stack:** Approved pnpm monorepo, NestJS, PostgreSQL/Prisma, Zod contracts, Next.js, Vitest/Testcontainers, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-skinlab-system-architecture-design.md`

**Phase B approval:** Roadmap approved on 2026-11-08; not authorized for execution because revalidation remains required. Revalidate actual item/unit masters, near-expiry threshold, return/quarantine policy, medication reservation/receipt guards, stocktake cutoff/concurrency, and receptionist/admin workflows.

## Global Constraints

- Item categories: medication for sale, medication/product used in treatment, and disposable materials; reusable assets are out of scope.
- Every item has a base unit and item-specific conversions for receipt, sale, and treatment use.
- Medicine/treatment products require lot and expiry; consumables are configurable per item.
- Available stock must never become negative.
- Issued but unfinished quantities are reserved and cannot be double-issued.
- Current clinic policy returns unused material; expired, damaged, contaminated, or otherwise unusable items use quarantine/adjustment, not normal return.
- Reception counts and enters; admin approves inventory adjustments and stocktake variances.

## Review Focus

- Concurrent issue requests that exceed the same lot's remaining availability must allow only the valid quantity and reject the rest.
- Changing a conversion factor after stock movement exists must not rewrite historical quantities or balances.
- FEFO must exclude expired, quarantined, recalled, and reserved quantities even when they belong to the earliest-expiry lot.
- A duplicate treatment finalization or medication dispense request must create one stock movement only.
- A stocktake started while movements occur must reconcile against its snapshot/cutoff without losing valid intervening movements.

---

### Task 1: Build item, unit, conversion, lot, and balance foundations

**Files:**

- Create: `packages/contracts/src/inventory.ts`
- Create: `api-skinlab/src/modules/inventory/domain/inventory-item.ts`
- Create: `api-skinlab/src/modules/inventory/domain/unit-conversion.ts`
- Create: `api-skinlab/src/modules/inventory/domain/inventory-lot.ts`
- Create: `api-skinlab/src/modules/inventory/domain/stock-movement.ts`
- Create: `api-skinlab/src/modules/inventory/application/create-inventory-item.ts`
- Create: `api-skinlab/src/modules/inventory/application/get-stock-balance.ts`
- Create: `api-skinlab/src/modules/inventory/infrastructure/prisma-inventory-repository.ts`
- Create: `api-skinlab/src/modules/inventory/http/inventory-items.controller.ts`
- Create: `api-skinlab/src/modules/inventory/inventory.module.ts`
- Create: `api-skinlab/src/modules/inventory/domain/unit-conversion.test.ts`
- Create: `api-skinlab/src/modules/inventory/application/get-stock-balance.integration.test.ts`
- Create: `admin-skinlab/src/features/inventory-items/**`

**Interfaces:**

- Consumes: Admin authorization, audit, transaction manager.
- Produces: `createInventoryItem(command): Promise<InventoryItem>` including lot/expiry policy and `nearExpiryWarningDays`; `convertToBase(itemId, quantity, unit): BaseQuantity`; `getStockBalance(query): Promise<StockBalance>` with on-hand/reserved/available by lot.

- [ ] **Step 1: Write failing unit and policy tests**

Cover box→blister→tablet, box→piece, invalid fractional base unit, item-specific conversions, required lot/expiry policy, and conversion-change rejection after first movement.

- [ ] **Step 2: Run unit tests**

Run: `pnpm --filter @skinlab/api test -- unit-conversion.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement item and conversion value objects**

Use decimal-safe quantities where fractional usage is allowed; store canonical base quantity and original entered quantity/unit on every movement.

- [ ] **Step 4: Write and run failing balance integration test**

Run: `pnpm --filter @skinlab/api test:integration -- get-stock-balance.integration.test.ts`

Expected: FAIL before movement projection exists.

- [ ] **Step 5: Implement immutable movements and balances**

Balance is on-hand minus reservations; block negative availability at the database transaction boundary.

- [ ] **Step 6: Add admin item-master UI and run tests**

Run: `pnpm --filter @skinlab/api test -- modules/inventory && pnpm --filter @skinlab/api test:integration -- modules/inventory && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/contracts/src/inventory.ts api-skinlab/src/modules/inventory admin-skinlab/src/features/inventory-items
git commit -m "feat(inventory): add items units lots and balances"
```

### Task 2: Implement confirmed stock receipts

**Files:**

- Create: `packages/contracts/src/stock-receipts.ts`
- Create: `api-skinlab/src/modules/inventory/domain/stock-receipt.ts`
- Create: `api-skinlab/src/modules/inventory/application/create-stock-receipt-draft.ts`
- Create: `api-skinlab/src/modules/inventory/application/confirm-stock-receipt.ts`
- Create: `api-skinlab/src/modules/inventory/application/confirm-stock-receipt.integration.test.ts`
- Create: `api-skinlab/src/modules/inventory/http/stock-receipts.controller.ts`
- Create: `admin-skinlab/src/features/stock-receipts/**`

**Interfaces:**

- Consumes: Item/conversion policies, receptionist identity, audit, idempotency.
- Produces: `createStockReceiptDraft(command): Promise<StockReceiptDraft>`; `confirmStockReceipt(command): Promise<ConfirmedStockReceipt>` creating `RECEIPT` movements.

- [ ] **Step 1: Write failing stock-receipt tests**

Cover draft edit, missing required lot/expiry, rejection when `expiryDate <= receiptDate`, near-expiry warning based on item policy, required acknowledgement/reason for near-expiry acceptance, confirmation adding base quantity, duplicate confirmation, and post-confirmation mutation denial.

- [ ] **Step 2: Run integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- confirm-stock-receipt.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement draft and confirmation transaction**

Do not implement purchase orders or supplier debt. Store optional source/reference text only. Reject already-expired incoming lots; allow a near-expiry lot only after reception records an acknowledgement and reason under the item's configured warning threshold.

- [ ] **Step 4: Add reception stock-receipt UI**

Show entered unit, converted base quantity, lot, expiry, and final confirmation warning.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm --filter @skinlab/api test:integration -- modules/inventory && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

```bash
git add packages/contracts/src/stock-receipts.ts api-skinlab/src/modules/inventory admin-skinlab/src/features/stock-receipts
git commit -m "feat(inventory): add confirmed stock receipts"
```

### Task 3: Implement treatment material request, issue, use, and return

**Files:**

- Create: `packages/contracts/src/treatment-materials.ts`
- Create: `api-skinlab/src/modules/inventory/domain/treatment-material-allocation.ts`
- Create: `api-skinlab/src/modules/inventory/application/create-material-request.ts`
- Create: `api-skinlab/src/modules/inventory/application/issue-treatment-materials.ts`
- Create: `api-skinlab/src/modules/inventory/application/confirm-actual-use.ts`
- Create: `api-skinlab/src/modules/inventory/application/return-unused-materials.ts`
- Create: `api-skinlab/src/modules/inventory/application/close-material-reconciliation.ts`
- Create: `api-skinlab/src/modules/inventory/application/treatment-materials.integration.test.ts`
- Create: `api-skinlab/src/modules/inventory/http/treatment-materials.controller.ts`
- Create: `admin-skinlab/src/features/treatment-materials/**`

**Interfaces:**

- Consumes: Treatment session ID, expected materials from performed services, doctor/reception roles, FEFO selector.
- Produces: `createMaterialRequest`; `issueTreatmentMaterials`; `confirmActualUse`; `returnUnusedMaterials`; `closeMaterialReconciliation`; quantities expected/issued/used/returned per item/lot.

- [ ] **Step 1: Write failing material lifecycle tests**

Cover expected versus issued, partial issue, extra use with availability, concurrent double issue, doctor actual-use confirmation, reception return to same lot, invalid return above unused quantity, and duplicate finalization.

- [ ] **Step 2: Run integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- treatment-materials.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement reservations and movements**

Issue creates reservation/issued state; actual use creates `CONSUMPTION`; return releases reservation to the original lot; final net decrease equals actual use.

- [ ] **Step 4: Add doctor and reception UIs**

Doctor sees expected/issued and confirms used; reception sees issued/used/returnable and closes reconciliation.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm --filter @skinlab/api test:integration -- modules/inventory && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

```bash
git add packages/contracts/src/treatment-materials.ts api-skinlab/src/modules/inventory admin-skinlab/src/features/treatment-materials
git commit -m "feat(inventory): add treatment material reconciliation"
```

### Task 4: Connect clinical completion to inventory-pending session closure

**Files:**

- Create: `api-skinlab/src/modules/clinical-records/application/treatment-materials.port.ts`
- Create: `api-skinlab/src/modules/inventory/application/clinical-materials.adapter.ts`
- Modify: `api-skinlab/src/modules/clinical-records/application/complete-clinical-record.ts`
- Modify: `api-skinlab/src/modules/treatment-courses/domain/treatment-session.ts`
- Create: `api-skinlab/src/modules/inventory/application/clinical-completion-materials.integration.test.ts`

**Interfaces:**

- Consumes: Doctor material-use declaration from the clinical record and inventory allocation from Task 3.
- Produces: `TreatmentMaterialsPort.confirmUseForClinicalCompletion(command, tx)`; session transition `IN_PROGRESS -> INVENTORY_PENDING -> CLOSED`.

- [ ] **Step 1: Write failing cross-module tests**

Cover clinical completion confirming actual use, entitlement consumption remaining atomic, inventory failure rolling back completion, later reception return, and closing without reopening the clinical record.

- [ ] **Step 2: Run integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- clinical-completion-materials.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement the inventory port and orchestration**

Clinical Records calls the port; it never writes inventory tables. Reception reconciliation occurs in a later transaction.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm --filter @skinlab/api test:integration -- modules/clinical-records modules/treatment-courses modules/inventory modules/commercial`

Expected: PASS.

```bash
git add api-skinlab/src/modules/clinical-records api-skinlab/src/modules/treatment-courses api-skinlab/src/modules/inventory
git commit -m "feat(inventory): link clinical completion to material use"
```

### Task 5: Implement FEFO, quarantine, expiry, and recall traceability

**Files:**

- Create: `packages/contracts/src/stock-control.ts`
- Create: `api-skinlab/src/modules/inventory/application/select-fefo-lots.ts`
- Create: `api-skinlab/src/modules/inventory/application/quarantine-lot.ts`
- Create: `api-skinlab/src/modules/inventory/application/recall-lot.ts`
- Create: `api-skinlab/src/modules/inventory/jobs/mark-expired-lots.ts`
- Create: `api-skinlab/src/modules/inventory/application/trace-lot-usage.ts`
- Create: `api-skinlab/src/modules/inventory/application/select-fefo-lots.test.ts`
- Create: `api-skinlab/src/modules/inventory/application/trace-lot-usage.integration.test.ts`
- Create: `admin-skinlab/src/features/stock-control/**`

**Interfaces:**

- Consumes: Lot balances, movements, clinic timezone, scheduled jobs.
- Produces: `selectFefoLots(itemId, requiredBaseQuantity, asOf)`; `quarantineLot`; `recallLot`; `traceLotUsage(lotId): Promise<PatientSessionReference[]>`.

- [ ] **Step 1: Write failing FEFO tests**

Cover earliest expiry, same-expiry tie, expired exclusion, quarantined/recall exclusion, reservations, insufficient quantity, and item without expiry tracking.

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @skinlab/api test -- select-fefo-lots.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement FEFO and lot status**

Lot states are `AVAILABLE`, `QUARANTINED`, `RECALLED`, `EXPIRED`, `DEPLETED`; status changes are audited and never rewrite movements.

- [ ] **Step 4: Implement patient/session traceability and expiry job**

Trace returns only references authorized for the requesting role; expiry marking is idempotent.

- [ ] **Step 5: Add stock-control UI and run tests**

Run: `pnpm --filter @skinlab/api test -- modules/inventory && pnpm --filter @skinlab/api test:integration -- trace-lot-usage.integration.test.ts && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/src/stock-control.ts api-skinlab/src/modules/inventory admin-skinlab/src/features/stock-control
git commit -m "feat(inventory): add fefo quarantine and traceability"
```

### Task 6: Implement prescription dispensing and medication-sale fulfillment

**Files:**

- Create: `api-skinlab/src/modules/inventory/application/reserve-medication-sale.ts`
- Create: `api-skinlab/src/modules/inventory/application/release-medication-sale-reservation.ts`
- Create: `api-skinlab/src/modules/inventory/application/dispense-prescription.ts`
- Create: `api-skinlab/src/modules/inventory/application/medication-dispensing.port.ts`
- Create: `api-skinlab/src/modules/commercial/application/inventory-availability.port.ts`
- Create: `api-skinlab/src/modules/commercial/application/inventory-dispensing.adapter.ts`
- Create: `api-skinlab/src/modules/commercial/application/inventory-receipt-usage.adapter.ts`
- Create: `api-skinlab/src/modules/commercial/application/confirm-medication-sale-payment.ts`
- Modify: `api-skinlab/src/modules/commercial/commercial.module.ts`
- Create: `api-skinlab/src/modules/inventory/application/dispense-prescription.integration.test.ts`
- Create: `admin-skinlab/src/features/medication-dispensing/**`

**Interfaces:**

- Consumes: Active prescription and medication-sale draft from Plan 04, full-payment/receipt components, FEFO selector, stock balance, and transaction manager.
- Produces: `InventoryAvailabilityPort.reserveForMedicationSale(command): Promise<MedicationReservation>`; `.releaseForCancelledUnpaidSale(command)`; `confirmMedicationSalePayment(command): Promise<{ reservation, payment, receipt, sale }>`; `dispensePrescription(command): Promise<MedicationDispense>`; and `MedicationDispensingPort` that atomically consumes the reservation and marks prescription/sale `DISPENSED` once.

- [ ] **Step 1: Write failing dispensing tests**

Cover active prescription required, exact medicine/quantity, reservation before funds confirmation, insufficient/expired stock producing no confirmed payment/receipt, no automatic substitution, separate lots, duplicate reservation/payment/dispense requests, unpaid-draft cancellation releasing reservation, receipt replacement preserving reservation before dispense, and receipt replacement denial after dispensing.

- [ ] **Step 2: Run integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- dispense-prescription.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement reservation-before-payment transaction**

Reserve eligible FEFO stock before confirming funds or issuing a receipt. If reservation fails, payment remains unconfirmed and no receipt is issued. A paid sale keeps its reservation through receipt correction-and-replacement because the underlying sale continues; only cancellation of an unpaid draft releases it.

- [ ] **Step 4: Implement dispensing transaction**

Create stock consumption, dispense record, prescription state, and sale state atomically; do not alter the already-issued receipt.

- [ ] **Step 5: Add reception reservation/payment/dispensing UI**

Show prescription, proposed FEFO lots, reserved quantity, explicit unavailable-stock outcome, payment action only after reservation, and dispense confirmation.

- [ ] **Step 6: Run tests and commit**

Run: `pnpm --filter @skinlab/api test:integration -- modules/inventory modules/commercial modules/clinical-records && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

```bash
git add api-skinlab/src/modules admin-skinlab/src/features/medication-dispensing
git commit -m "feat(inventory): dispense paid prescriptions"
```

### Task 7: Implement daily reconciliation and approved stocktakes

**Files:**

- Create: `packages/contracts/src/stocktakes.ts`
- Create: `api-skinlab/src/modules/inventory/domain/stocktake.ts`
- Create: `api-skinlab/src/modules/inventory/application/start-stocktake.ts`
- Create: `api-skinlab/src/modules/inventory/application/enter-blind-count.ts`
- Create: `api-skinlab/src/modules/inventory/application/recount-variance.ts`
- Create: `api-skinlab/src/modules/inventory/application/approve-stocktake.ts`
- Create: `api-skinlab/src/modules/inventory/application/create-inventory-adjustment.ts`
- Create: `api-skinlab/src/modules/inventory/application/get-daily-reconciliation.ts`
- Create: `api-skinlab/src/modules/inventory/application/stocktake.integration.test.ts`
- Create: `admin-skinlab/src/features/stocktakes/**`

**Interfaces:**

- Consumes: Inventory movement cutoff/snapshot, reception counter, admin approver, audit.
- Produces: `startStocktake(scope, cutoff): Stocktake`; `enterBlindCount`; `recountVariance`; `approveStocktake`; `getDailyReconciliation(date)`.

- [ ] **Step 1: Write failing stocktake tests**

Cover hidden expected quantity, snapshot plus intervening movements, recount, same-person approval denial, admin approval creating one adjustment, duplicate approval, and cancelled stocktake.

- [ ] **Step 2: Run integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- stocktake.integration.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement blind count and variance workflow**

Daily reconciliation lists unfinished receipts/issues/returns/dispenses. Weekly scope selects important items; monthly scope includes all active items after 19:00.

- [ ] **Step 4: Add reception/admin stocktake UI**

Reception sees count entry without expected quantity; admin sees expected, actual, recount, reason, and approval action.

- [ ] **Step 5: Run tests and commit**

Run: `pnpm --filter @skinlab/api test:integration -- modules/inventory && pnpm --filter @skinlab/admin-web test`

Expected: PASS.

```bash
git add packages/contracts/src/stocktakes.ts api-skinlab/src/modules/inventory admin-skinlab/src/features/stocktakes
git commit -m "feat(inventory): add reconciliation and stocktakes"
```

### Task 8: Verify inventory journeys end to end

**Files:**

- Create: `tests/e2e/inventory-stocktake.spec.ts`

**Interfaces:**

- Consumes: Plans 01–04 and all tasks above.
- Produces: Inventory E2E acceptance gate.

- [ ] **Step 1: Write failing E2E journeys**

Receive boxed stock into lots, issue FEFO materials to a session, doctor confirms partial use, reception returns remainder and closes session, sell/dispense prescribed medicine, quarantine a lot, trace patients, perform blind monthly count, and approve variance.

- [ ] **Step 2: Run E2E**

Run: `pnpm test:e2e -- inventory-stocktake.spec.ts`

Expected: FAIL until all cross-module wiring is complete.

- [ ] **Step 3: Complete only missing inventory adapters**

Preserve all module ownership rules and immutable movement history.

- [ ] **Step 4: Run the phase quality gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm test:e2e -- inventory-stocktake.spec.ts && pnpm build`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/inventory-stocktake.spec.ts admin-skinlab api-skinlab
git commit -m "feat: deliver inventory and stocktake workflows"
```
