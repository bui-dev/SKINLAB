# SkinLab Clinic Operations System — System and Architecture Design

- **Status:** Approved by the owner on 2026-11-08
- **Date:** 2026-11-08
- **Scope:** MVP for one dermatology clinic
- **Chosen approach:** Separate web frontend and modular-monolith backend

## 1. Intent and why

SkinLab needs an internal system to replace informal, paper-heavy clinic operations with a consistent and auditable workflow. The immediate priority is appointment and day-of queue management; the same system must also create structured clinical records, track treatment-course entitlements, collect full payment and issue internal receipts, and establish inventory control where the current process is largely verbal.

The system is for one clinic with two doctors, one receptionist who also acts as stock keeper, and an admin. It is not intended to be a general hospital platform or a multi-tenant SaaS product.

The design optimizes for correctness, patient safety, privacy, operational clarity, and maintainability rather than extreme scale.

## 2. Goals

1. Give reception a reliable view of doctor availability, booked appointments, walk-ins, check-ins, delays, and the live waiting queue.
2. Preserve continuity with a primary doctor for each active treatment course while supporting temporary substitution and formal transfer.
3. Replace paper-only clinical records with structured, versioned records and doctor-only clinical images.
4. Represent fixed service packages separately from doctor-adjustable treatment plans.
5. Record full payment by cash or transfer and issue an internal receipt.
6. Track stock by item, unit conversion, lot, expiry, movement, treatment-session consumption, return, and stocktake.
7. Provide individual accounts, least-privilege access, two-factor authentication, immutable audit history, backup, and tested recovery.
8. Give the development team clear module seams so features can be implemented and tested without microservice-level operational complexity.

## 3. Non-goals for the MVP

- Multiple clinics, tenants, or inter-branch stock transfer.
- Offline data entry or automatic conflict synchronization.
- Patient self-service portal or mobile application.
- Integration with Zalo, Messenger, Telegram, or other communication channels.
- Automated sending of confirmations or reminders.
- Electronic tax invoices.
- Installments, accounts receivable, debt collection, or refunds.
- Discounts, promotions, coupons, or gifts that change package value.
- Supplier purchase orders, quotations, or supplier debt.
- Assistant accounts, assistant schedules, or assistant-capacity planning.
- Reusable-asset lifecycle, equipment maintenance, or sterilization tracking.
- Automatic capture from cameras or phones.
- Microservices, event streaming infrastructure, or independent databases per module.
- A claim of legal equivalence to a fully compliant paperless electronic medical record before a dedicated compliance review and implementation of required signatures and procedures.

## 4. Domain language

Canonical terms are maintained in [CONTEXT.md](../../CONTEXT.md). Important distinctions include:

- A **Patient** is the person receiving care; a commercial relationship does not replace the clinical identity.
- An **Appointment** is planned care; an **Encounter** is care that actually occurred.
- A **Service Package** is a fixed commercial entitlement; a **Treatment Plan** is the doctor-managed clinical execution plan.
- A **Prescription** is a doctor's order; **Medication Dispensing** is the inventory operation that fulfills it.
- **Cancelled** and **No-show** are different appointment outcomes.
- A **Primary Doctor** owns the course of care; a **Performing Doctor** may substitute for one session.

## 5. Users and authority

### Receptionist / stock keeper

- Create and update patient administrative information.
- Collect initial history supplied by the patient.
- Create, confirm, reschedule, cancel, and check in appointments.
- Manage the live waiting queue and contact tasks.
- Record full payments and issue internal receipts.
- Create stock receipts, issue materials, process returns, and enter physical counts.
- Cannot confirm clinical truth, view clinical images, approve their own stock adjustments, or edit completed clinical records.

### Doctor

- Review and confirm history, underlying conditions, and allergies before treatment.
- Examine, diagnose, create and revise treatment plans, prescribe, record progress, and complete clinical records.
- Recommend fixed packages but never alter their price or entitlement.
- Reorder or redistribute included services between sessions without exceeding package entitlement.
- Request materials and confirm actual consumption.
- Add and view clinical images.
- Submit leave requests.

### Admin

- Manage master data, service packages, prices, users, roles, and access policy.
- Approve or reject doctor leave.
- Approve service/cost changes, receipt cancellation, inventory adjustment, and stocktake variance.
- Confirm that legacy-paper migration is complete, but not confirm clinical correctness unless separately acting as a qualified doctor.
- Access the system remotely with mandatory two-factor authentication.
- Does not receive default access to clinical images.

## 6. Appointment and queue design

### 6.1 Intake

Reception manually creates appointments from external conversations or creates a walk-in visit at the front desk. The MVP stores contact preference and contact history but does not read or send messages.

An appointment may produce at most one encounter for the scheduled visit. Cancelled, rescheduled, and no-show appointments produce no encounter. A walk-in may create an encounter without a prior appointment. A treatment session is the treatment-course-specific clinical work performed within an encounter; an initial consultation encounter may exist without a treatment session.

### 6.2 Doctor capacity

- Clinic hours and default doctor availability are 09:00–19:00.
- Appointment duration is derived from services planned for that treatment session.
- A service has ordered stages, total patient time, and one or more estimated direct-doctor segments. Non-doctor stages remain unassigned in the MVP.
- Assistant work may be recorded as a stage or note, but assistant availability is not scheduled in the MVP.
- The scheduler uses the combined doctor segments as the constrained resource and patient elapsed time as informational. Before a service is known, an initial consultation or walk-in uses a configurable default assessment duration.

### 6.3 Primary-doctor continuity

- Each active treatment course has a primary doctor.
- Appointment suggestions prefer that doctor.
- A patient may accept a substitute for one session without transferring primary ownership.
- Permanent transfer is a separate, reasoned, audited action.

### 6.4 Walk-in policy

The approved hybrid policy protects booked appointments while filling safe gaps:

1. Check in and capture the walk-in's preliminary need.
2. Estimate when a doctor becomes free and the direct-doctor time required.
3. Start the walk-in only when the estimated work plus configurable safety buffer will not delay the next booked patient.
4. Otherwise offer the next safe gap, another doctor if the patient agrees, or a future booking.
5. Ordinary walk-ins are ordered by check-in time.
6. Clinical urgency may override the queue only after clinician assessment; reception does not diagnose.

### 6.5 Late arrival and no-show

- At T−10 minutes, the system creates a receptionist contact reminder if the patient has not checked in.
- At appointment time, the patient is marked not yet arrived.
- At T+15 minutes, priority is released and checked-in patients may move ahead.
- A later arrival is marked late and joins the appropriate waiting position.
- At 19:00, an appointment with no check-in becomes **No-show**, not **Cancelled**.
- The 15-minute grace period is configurable by admin.

### 6.6 Doctor leave

- A doctor requests leave for the following week during Monday–Friday of the preceding week.
- Admin approves or rejects the request.
- Approved leave creates unavailable calendar time.
- Emergency leave is an admin-created exception with a required reason.
- Conflicting appointments enter **Needs rescheduling**; reception contacts patients and records attempts.
- The replacement appointment links to the original, whose reason is preserved.

## 7. Clinical record design

### 7.1 Record structure

The record has eight business sections:

1. Administrative information.
2. Medical history and current history.
3. Examination.
4. Diagnosis and treatment.
5. Treatment progress.
6. Prescription.
7. Materials used.
8. Summary.

They are not stored as one undifferentiated form:

- Patient-level: identity, contact, ongoing history, underlying conditions, allergies.
- Encounter/session-level: examination, assessment, diagnosis, performed services, prescription, actual materials, outcome.
- Treatment-course-level: plan revisions, progress across sessions, final summary.

### 7.2 Safety confirmation

Reception enters patient-reported history. Before diagnosis or treatment, a doctor must review and confirm history, underlying conditions, and allergies. The system blocks treatment completion while required confirmation is absent.

### 7.3 Draft, completion, and amendment

- A draft is freely editable by its authorized author.
- Doctor completion locks the clinical content.
- Later correction creates an addendum/amendment containing original value, corrected value, reason, author, and timestamp.
- Neither admin nor doctor silently deletes or overwrites completed history.

### 7.4 Clinical images

- Only doctors may add or view clinical images.
- Images link to patient, encounter/session, treatment course, body area, view, capture time, upload time, category, and clinical note.
- Clinical-use consent is recorded separately from any training or marketing consent.
- The original is private and immutable after record completion; display derivatives remove unnecessary metadata such as GPS location.
- All view, upload, and export activity is audited.
- Reception and admin may see operational metadata such as storage health but not image content.
- Capture-device management is outside the MVP. Clinic-owned devices are preferred, and operational policy requires removal of unnecessary copies after successful upload.
- A doctor who attaches an image to the wrong patient/session marks it **Entered in error** and relinks or uploads the correct image through an audited correction; the original is hidden from ordinary clinical view but not silently erased. Consent withdrawal does not automatically delete a legally retained medical record; a dedicated privacy/compliance procedure decides restriction or deletion.

### 7.5 Legacy paper migration

- Existing paper records are manually entered because volume is small.
- Imported content is labeled **Migrated from paper** and stores the source date, entry date, and entry person.
- Reception enters administrative sections; doctors enter or verify clinical sections.
- Admin checks migration completeness only.
- Doctors confirm clinical accuracy.
- Paper originals remain retained until a separately reviewed legal and operational policy authorizes otherwise.
- Cutover also establishes opening data for future appointments, active treatment courses, purchased packages and remaining entitlement, current stock by lot/expiry, and any still-actionable prescriptions. Opening balances are reconciled and approved before go-live.

## 8. Service package and treatment-course design

### 8.1 Fixed package catalog

Admin creates package versions containing name, description, price, number of sessions, included services, quantities, and default distribution across sessions. Doctors can recommend but cannot modify the package.

A change to price or entitlement creates a new version. Sold packages retain a snapshot of the original version.

### 8.2 Entitlement ledger

Each purchased package tracks, per service:

- Total entitlement.
- Reserved/scheduled quantity.
- Completed/consumed quantity.
- Released quantity after cancellation.
- Remaining quantity.

Entitlement is consumed only when the service is actually completed.

In the MVP, one purchased package creates and funds one treatment course. Entitlement is never shared across courses, and one course does not consume from multiple package purchases. A later additional package creates a separate course that may be related for navigation but maintains its own ledger.

### 8.3 Clinical flexibility

Doctors may reorder services or redistribute them across sessions while staying within entitlement. A plan revision preserves previous versions and does not alter the commercial package.

The package session count is a hard entitlement in the MVP. Doctors may reorder and redistribute included services but may not split, merge, add, or remove entitled sessions. Additional treatment requires another package or a future explicitly designed exception workflow.

An out-of-package need becomes a proposal for an additional package or a separately approved commercial decision; it is never added silently.

### 8.4 Package lifecycle

- Pending payment.
- Active after full payment.
- Paused without loss of entitlement.
- Completed when entitlement and treatment are finished.

Packages have no expiry in the MVP.

## 9. Payment and internal receipt design

- Accepted methods: cash and bank transfer.
- Chargeable MVP transactions are fixed service-package purchases and prescription-medicine sales. Standalone consultation fees, ad-hoc service sales, and miscellaneous charges are outside the MVP unless later added through a new approved design.
- The MVP requires one full payment; it does not split payment or create debt.
- A transfer records transaction reference and optional private evidence image.
- Reception must verify funds before marking payment complete.
- Payment evidence is accessible to reception and admin, not doctors.
- A completed payment activates the purchased package and issues an internal receipt.
- A receipt snapshots patient, package version, amount, method, collector, time, and clinic identity.
- Issued receipts are immutable. Reception requests cancellation; admin approves; history is preserved.
- Receipt cancellation is correction-and-replacement only and does not perform a refund. It is allowed only before associated package entitlement or dispensed medicine has been consumed. After care or dispensing has occurred, the MVP blocks cancellation and requires an explicit admin escalation outside the automated workflow.

## 10. Inventory design

### 10.1 Item categories

- Medicines sold to patients.
- Medicines/products used during treatment.
- Disposable treatment materials.
- Reusable assets and equipment are out of scope.

### 10.2 Units of measure

Each item defines:

- Purchase unit.
- Permitted sale units.
- Treatment-use unit.
- Base stock unit.
- Item-specific conversion factors.
- Whether a package may be opened or sold partially.

Stock is calculated in base units while transactions preserve the user's entered unit and conversion.

### 10.3 Lot and expiry policy

Tracking is configured per item:

- Lot and expiry required.
- Lot required, no expiry.
- No lot/expiry tracking.

Medicines and treatment products require lot and expiry. Consumables are configurable because some sterile supplies also expire.

The system proposes first-expiry-first-out. Expired, recalled, or quarantined stock is not available for issue.

### 10.4 Stock receipt

The MVP starts when goods physically arrive. Reception creates a draft stock receipt and confirms it after recording item, quantity, unit, lot, expiry, receipt date, and optional source-document reference. Confirmation changes stock; later mistakes use adjustment transactions rather than editing history.

### 10.5 Treatment issue and return

For a treatment session the system keeps separate quantities:

- Expected from service defaults.
- Issued by reception.
- Actually used, confirmed by doctor.
- Returned by reception.

Unused material is returnable under the current clinic policy. The net stock decrease equals actual use. Issued-but-unfinalized stock is reserved and cannot be double-issued. Expired, damaged, contaminated, or otherwise unusable items never use the normal return path; they require quarantine or adjustment with an auditable reason and approval.

### 10.6 Stocktake

- Daily: reconcile incomplete issue, return, prescription, and stock-receipt work.
- Weekly: cycle-count high-value, fast-moving, near-expiry, or historically discrepant items.
- Monthly after 19:00: full blind count.
- Reception enters counts; admin approves discrepancies and resulting adjustment transactions.
- The counter cannot approve their own adjustment.

## 11. Chosen architecture

### 11.1 Approach decision

The owner selected **separate web frontend + modular-monolith backend**.

This provides clearer seams than a single framework-bound full-stack application while avoiding distributed transactions, independent databases, service discovery, and operational overhead that microservices would introduce at the clinic's scale.

### 11.2 Logical containers

```text
Clinic desktop browsers                  Remote admin browser
          │                                      │
          └──────────── Secure access gateway ───┘
                                 │
                            Web frontend
                                 │ HTTPS
                       Modular-monolith backend
                          │                  │
                     PostgreSQL       Private object storage
                          │                  │
                          └──── Backup / recovery ────┘
```

Supporting platform capabilities include identity/MFA, scheduled jobs, monitoring, centralized logs, secret management, and backup verification.

Clinic-only roles require both a clinic-approved access path and a registered managed device. Remote admin access requires an approved device, MFA, and higher-risk session controls. The exact gateway may use a zero-trust access product or VPN; it must not depend solely on a static public IP.

### 11.3 Backend modules

1. **Identity and Access** — users, roles, MFA policy, sessions, clinic/remote restrictions.
2. **Patient Registry** — canonical patient identity and administrative profile.
3. **Scheduling and Queue** — availability, appointments, check-in, waiting queue, leave, contact tasks.
4. **Clinical Records** — history verification, encounters, diagnoses, prescriptions, locked records, amendments.
5. **Treatment Courses** — treatment plans, versions, sessions, primary-doctor ownership, progress, summaries.
6. **Catalog and Packages** — service master, duration, package versions, entitlements.
7. **Payments and Receipts** — payment confirmation, evidence metadata, receipt issuance/cancellation.
8. **Inventory** — item master, units, lots, balances, receipts, issues, returns, adjustments, stocktakes.
9. **Media** — private clinical images and payment evidence with separate access policies.
10. **Audit and Operations** — immutable audit events, scheduled status changes, reminders, monitoring hooks.

Modules share one transactional database but own their tables and invariants. One module must not directly update another module's tables; it calls that module's application interface. Cross-module transactions that must be atomic remain inside the backend process and database transaction.

### 11.4 Deep-module interfaces

Interfaces should express business outcomes rather than CRUD pass-through. Examples:

- `scheduleAppointment(...)` enforces doctor availability, duration, leave, and conflict rules.
- `checkInPatient(...)` applies late-arrival and queue rules.
- `completeTreatmentSession(...)` locks clinical content, consumes entitlement, and initiates final material reconciliation.
- `confirmPayment(...)` validates full payment, issues a receipt, and activates the package atomically.
- `finalizeStocktake(...)` validates recount/approval and creates auditable adjustments.

The interface is also the primary test surface. Internal adapters may vary for database, object storage, identity provider, and notifications without exposing infrastructure details to callers.

## 12. Core data model

The implementation plan may refine names, but the design requires these relationships:

```text
Patient
├── PatientHistory / Allergy / Condition
├── Appointment ──> Encounter
├── TreatmentCourse ──> TreatmentPlanVersion ──> TreatmentSession
│                         │                         ├── PerformedService
│                         │                         ├── MaterialConsumption
│                         │                         └── ClinicalImage
│                         └── PrimaryDoctor
├── PurchasedPackage ──> EntitlementLedger
│        └── Payment ──> Receipt
└── Prescription ──> MedicationDispense

InventoryItem ──> InventoryLot ──> StockMovement
Doctor ──> LeaveRequest
User ──> RoleAssignment / AuditEvent
```

Important uniqueness and consistency rules include patient-duplicate detection, unique receipt identifiers, no negative available stock, immutable completed records, package-entitlement limits, and appointment conflict prevention.

The patient registry requires full name, date/year of birth when known, and at least one contact method; national identifier is optional. The system warns on likely duplicates using normalized identity/contact data. Admin may perform an audited merge after review; source identifiers and reassignment history remain available so an erroneous merge can be reversed through a controlled operation.

## 13. Cross-module consistency

Critical operations require explicit orchestration:

- **Payment confirmation:** payment, receipt, and package activation succeed or fail together.
- **Treatment completion:** clinical completion locks the clinical record and consumes entitlement. The treatment session may then remain **Inventory pending** until reception completes issue/return reconciliation; inventory delay does not reopen the clinical record or delay entitlement consumption.
- **Prescription dispensing:** a prescription does not reduce stock; confirmed dispensing does.
- **Leave approval:** approved leave creates unavailability and atomically identifies affected appointments, but reception performs rescheduling separately.
- **Receipt/record correction:** original data remains immutable; a cancellation or amendment references it.

## 14. Security and privacy

- Individual accounts only; no shared credentials.
- Two-factor authentication for all users.
- Doctors and reception can access only through the clinic-approved access path and from a registered managed device.
- Admin may access remotely with enforced MFA and higher-risk session controls.
- Least-privilege authorization is enforced in the backend, not only hidden in the UI.
- Clinical-image access is doctor-only.
- TLS in transit; encrypted managed storage at rest.
- Short-lived authorized URLs for private files; no public object URLs.
- Audit login, failed login, clinical-record access/change, image access, receipt action, and inventory adjustment.
- Session timeout on inactivity and global revocation for compromised accounts.
- Disable departed-user accounts without deleting their history.
- Secrets stay outside source code and client-visible environment variables.

Vietnam's current personal-data and electronic-medical-record rules require a dedicated compliance checklist before production. This design is a technical foundation, not a legal certification.

Before production, a named compliance workstream must resolve signature method, consent wording, clinical-record and audit retention, data residency, lawful image handling, external disclosure, and whether paper remains the legally authoritative record. Go-live cannot claim paperless legal equivalence until that gate is satisfied.

## 15. Availability, backup, and recovery

- The product is online-only; no offline synchronization.
- **RTO:** 4 hours.
- **RPO:** 15 minutes.
- Managed PostgreSQL with continuous/point-in-time recovery capability.
- Encrypted daily full backup retained separately from the primary runtime.
- Private object storage with versioning and recovery policy.
- Monitoring for application health, database health, backup failure, storage growth, and authentication anomalies.
- Quarterly restore drill with written evidence.
- During outage, the clinic uses controlled paper forms and later imports data as **Entered after incident**, followed by reconciliation of appointments, receipts, clinical notes, and stock.

## 16. Performance and scale

Expected initial load is approximately 8–12 patient visits per day with a small number of concurrent internal users. The architecture does not need horizontal microservice scaling.

The implementation should prioritize responsive interactive screens, indexed patient/appointment searches, predictable database transactions, and safe retries that do not create duplicate bookings, receipts, or stock movements.

Images should use display derivatives and lazy loading rather than downloading originals into routine list views.

## 17. Testing strategy

### Domain and application tests

- Appointment conflicts, grace period, no-show, walk-in insertion, doctor leave.
- Required history/allergy confirmation.
- Record locking and amendment history.
- Package versioning and entitlement consumption.
- Payment/receipt/package-activation transaction.
- Unit conversion, lot selection, expiry blocking, issue/use/return, stocktake adjustment.
- Authorization by role and location context.

### Integration tests

- PostgreSQL constraints and transactions.
- Private object-storage authorization.
- Identity/MFA integration.
- Scheduled jobs at clinic timezone.
- Backup and restore procedures.

### End-to-end acceptance journeys

1. Booked patient from manual message intake through check-in and completed first session.
2. Walk-in inserted without delaying a protected appointment.
3. Doctor leave approval and successful rescheduling.
4. Completed record amended without losing the original.
5. Package paid by transfer, evidence attached, receipt issued, package activated.
6. Materials issued, partially used, remainder returned, and stock reconciled.
7. System outage followed by paper fallback and labeled back-entry.

## 18. Implementation order — tech-lead workflow

Nothing is implemented until this design is approved. After approval, the tech lead writes a task-level implementation plan and establishes quality gates.

### Phase 0 — Design and project controls

1. Approve this design and unresolved compliance assumptions.
2. Decide repository layout and exact technology/provider choices.
3. Write ADRs only for hard-to-reverse decisions.
4. Establish coding standards, branch/review policy, CI, environments, and Definition of Done.

### Phase 1 — Secure foundation

1. Identity, individual accounts, roles, MFA, clinic/remote access policy.
2. Database migrations, audit event foundation, object storage, secrets.
3. Monitoring, backup, restore drill, and environment promotion.

### Phase 2 — Appointment vertical slice, the top business priority

1. Patient registry and duplicate detection.
2. Doctor availability and leave.
3. Service duration master data.
4. Appointment, manual contact task, check-in, late/no-show.
5. Walk-in queue and live day board.
6. Acceptance test with real clinic scheduling scenarios.

### Phase 3 — Clinical record and treatment course

1. History capture and doctor confirmation gate.
2. Encounter/session documentation.
3. Record completion, locking, and amendment.
4. Clinical images and doctor-only access.
5. Treatment plan versions and primary-doctor continuity.

### Phase 4 — Package, payment, and receipt

1. Service/package version catalog.
2. Purchased package and entitlement ledger.
3. Cash/transfer payment evidence.
4. Receipt issuance/cancellation and package activation.

### Phase 5 — Inventory

1. Items, units, conversions, lots, and expiry.
2. Stock receipts.
3. Treatment issue/use/return and medication dispensing.
4. FEFO selection and availability checks.
5. Daily reconciliation, weekly cycle count, monthly full stocktake.

### Phase 6 — Migration, hardening, and go-live

1. Manual legacy-data migration rehearsal.
2. Permission and privacy review.
3. Load and failure testing proportional to real scale.
4. Restore drill and incident rehearsal.
5. Staff training and parallel paper/system trial.
6. Controlled production cutover, monitoring, and post-go-live review.

Each phase is delivered through small tasks, test-first implementation where practical, peer review, security review for sensitive areas, and evidence-based verification before completion.

## 19. MVP acceptance outcomes

The MVP is acceptable when the clinic can demonstrate, using production-like data:

- Reception can determine whether a doctor can safely accept a booking.
- Booked, late, no-show, walk-in, checked-in, waiting, and in-progress patients are distinguishable.
- Doctor leave cannot silently strand appointments.
- A doctor cannot complete treatment before confirming safety-critical history.
- Completed clinical records and images cannot be silently overwritten.
- A purchased package cannot exceed its fixed entitlement.
- Full payment produces exactly one immutable internal receipt and activates the package.
- Every stock change is traceable; lot/expiry rules and no-negative-stock rules hold.
- Actual inventory can be reconciled and adjustments require admin approval.
- Unauthorized roles cannot access clinical images.
- Recovery tests demonstrate RTO 4 hours and RPO 15 minutes.

## 20. Approaches considered

### A. Single framework-bound full-stack application

Fastest initial delivery and lowest deployment count, but it risks coupling complex clinical, inventory, and financial rules to UI/framework conventions. It remains viable only if the team enforces equally strong internal module seams.

### B. Separate frontend + modular-monolith backend — selected

Provides a stable backend interface, clear domain modules, transactional consistency through one database, and moderate operational cost. It best fits the clinic's scale and the need for a maintainable internal system.

### C. Microservices

Would permit independent service deployment and scaling but introduces distributed transactions, eventual consistency, more infrastructure, and greater incident complexity. The present scale and one-team ownership do not justify it.

## 21. Decisions deliberately left to the builder/team

These choices do not change the product being built and may be selected during implementation planning:

- Exact frontend and backend frameworks.
- Exact managed cloud provider and identity provider.
- Exact table names, index design, internal code organization, and object-storage key format.
- Visual design system and detailed screen layout.
- Specific monitoring vendor, CI provider, and infrastructure-as-code tool.

The existing `admin-skinlab` Next.js foundation was subsequently selected as the frontend source. Repository layout is fixed by [ADR-0001](../../adr/0001-fresh-root-pnpm-monorepo.md): a fresh Git/pnpm root at `SKINLAB/` with `admin-skinlab`, `api-skinlab`, `packages`, `docker`, and `docs`.

## 22. References requiring implementation-time verification

- Vietnam Law on Personal Data Protection No. 91/2025/QH15, effective 2026-01-01.
- Vietnam Ministry of Health Circular 13/2025/TT-BYT on electronic medical records.
- HL7 FHIR distinctions for Appointment, Encounter, Episode of Care, and AllergyIntolerance as vocabulary guidance, not a requirement to expose a FHIR API in the MVP.
- WHO patient-safety incident reporting guidance.
- WHO good storage/distribution practices, including FEFO and periodic stock reconciliation.

## 23. Owner-confirmed builder-review clarifications

The owner explicitly confirmed these decisions on 2026-11-08:

1. One purchased package creates one treatment course; entitlement is not mixed across packages or courses.
2. Package session count is fixed. Doctors may only reorder and redistribute included services within those sessions.
3. A doctor may complete and lock the clinical record after confirming actual services and materials used. The treatment session remains **Inventory pending** until reception completes material reconciliation.
4. A receipt may be cancelled and replaced only before package entitlement is consumed or medicine is dispensed. After that point, the MVP permits audited correction but not cancellation.
5. Cutover migrates the operational opening state in addition to paper clinical records: future appointments, active courses, purchased packages and remaining entitlement, primary-doctor assignments, actionable prescriptions, and stock by lot/expiry. Completed historical operational transactions need not be recreated.
6. Compliance review is an early implementation workstream and a production gate. Paper remains the legally authoritative record until the clinic has confirmation that the electronic system may replace it.
