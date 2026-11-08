# SkinLab Tech Lead Learning Roadmap Design

**Status:** Draft for learner approval  
**Date:** 2026-11-08  
**Learner:** Product Owner / Engineering Coordinator  
**Duration:** Six weeks, two to three focused hours per day  
**Execution boundary:** Learning only; this draft does not authorize or govern product implementation

## 1. Intent

This roadmap uses the approved SkinLab documentation as a real case study for learning System Design, Architecture Design, and Tech Lead decision-making. Its purpose is not merely to help the learner remember what was decided. At the end, the learner should be able to explain the design from first principles, connect business rules to architecture and implementation plans, identify trade-offs and failure modes, and defend the design under review.

## 2. Target outcome

At the end of six weeks, the learner can deliver a 15-minute SkinLab design presentation and answer a 30-minute architecture-review session covering:

- why the MVP scope and non-goals are appropriate;
- how clinic workflows become states, invariants, data, and module boundaries;
- why SkinLab uses a separate Next.js frontend and NestJS modular monolith;
- how PostgreSQL, private object storage, identity, audit, backup, and monitoring fit together;
- where transaction boundaries and eventual operational steps differ;
- how security, privacy, RTO/RPO, testing, migration, and compliance gates affect the design;
- why the implementation order is structured as Foundation, A0, then vertical slices; and
- what evidence or new conditions would justify changing an architectural decision.

## 3. Goals

1. Understand the complete SkinLab project from context through approved plans and gates.
2. Learn System Design through SkinLab workflows, domain rules, data, failure cases, and quality attributes.
3. Learn Architecture Design through containers, modules, interfaces, data ownership, trust boundaries, and deployment decisions.
4. Build the habit of connecting every technical decision to a business or quality requirement.
5. Practice diagrams, written reasoning, teach-back, and architecture defense.
6. Produce durable learning artifacts under `docs/learning/` without modifying product code or starting implementation.

## 4. Non-goals

- Starting Foundation Task 1, A0, or any implementation plan.
- Initializing root Git, deleting nested Git metadata, installing dependencies, or creating infrastructure.
- Memorizing every implementation-plan file path or shell command.
- Treating provisional fake-staging choices as ratified production architecture.
- Claiming professional Tech Lead mastery solely from six weeks of document study.
- Replacing external technical, security, or compliance review.

## 5. Constraints

- The learner is a frontend developer who is beginning backend, database, security, and operations study.
- SkinLab has one learner/developer and uses AI as support, not accountable technical authority.
- Study must use the current approved documents and distinguish approved facts from proposals or provisional choices.
- Learning work never grants implementation authorization; delivery authorization is controlled separately by project governance and was granted for Foundation Task 1 on 2026-11-09.
- Real patient data, credentials, production configuration, and clinical images are prohibited in learning artifacts.
- Later repository or design changes may make plan details stale; the learner must understand revalidation rather than memorize them.

## 6. Approaches considered

### A. Linear document reading

Read Context, Governance, System Design, ADRs, Plans, and Reviews in filename order. This is fast for orientation but weak for retention and cross-layer reasoning.

### B. Vertical-slice learning with teach-back and defense — selected

Begin with a short project overview, then follow individual clinic journeys from requirement to workflow, state, domain model, module boundary, database implications, tests, and implementation plan. Each topic ends with a teach-back and review questions.

This approach was selected because the learner wants to defend the design as a Tech Lead, not only manage the project.

### C. Defense-first study

Start with architecture-review questions and research answers from the documents. This is effective for an experienced engineer but creates too much cognitive load before the learner has a stable project model.

### Combined learning loop

The selected curriculum combines a short linear overview with vertical slices and a defense exercise:

```text
Orient
  → read a focused document set
  → reconstruct the design in the learner's own words
  → draw the model or flow
  → connect it to plans and evidence
  → answer review questions
  → record gaps and corrections
```

## 7. Documentation map

The documents have different authority and should not be read as if they were equal.

### Layer 1 — Current state and orientation

- `docs/CONTEXT.md`
- `docs/governance/README.md`
- `docs/governance/PROJECT_CHARTER.md`
- `docs/governance/PHASE_A_COMPLETION.md`
- `docs/governance/PHASE_B_COMPLETION.md`

These answer: what SkinLab is, where the project is now, what is approved, and what is still blocked.

### Layer 2 — Authoritative system and architecture design

- `docs/superpowers/specs/2026-11-08-skinlab-system-architecture-design.md`

This is the primary learning source for requirements, workflows, architecture, data, quality attributes, testing, and technical delivery order.

### Layer 3 — Governance and decision rights

- `docs/superpowers/specs/2026-11-08-skinlab-project-governance-design.md`
- `docs/governance/ROLES_RACI.md`
- `docs/governance/DELIVERY_QUALITY.md`
- `docs/governance/CHANGE_CONTROL.md`
- `docs/governance/RISK_REGISTER.md`
- `docs/governance/REPOSITORY_GIT_POLICY.md`

These answer: who may decide, how work becomes ready/done, how changes are controlled, and which risks/gates remain.

### Layer 4 — Architectural decisions

- `docs/adr/README.md`
- `docs/adr/0001-fresh-root-pnpm-monorepo.md`
- Future accepted ADRs as they are created

ADRs explain the context, alternatives, decision, consequences, verification, and supersession rules for individual architectural choices.

### Layer 5 — Delivery plans and dependency evidence

- `docs/superpowers/plans/2026-11-08-skinlab-mvp-plan-index.md`
- `docs/superpowers/plans/2026-11-08-phase-b-traceability-matrix.md`
- `docs/superpowers/plans/2026-11-08-phase-b-dependency-gates.md`
- A0 and Plans 1–6

Plans answer how approved outcomes may be implemented. They are not automatically more authoritative than the System/Architecture Design.

### Layer 6 — Review evidence

- `docs/reviews/2026-11-08-phase-a-governance-review.md`
- `docs/reviews/2026-11-08-phase-b-plan-review.md`
- `docs/superpowers/plans/2026-11-08-phase-b-plan-review-matrix.md`

Review records explain what was challenged, corrected, verified, and left behind a gate.

## 8. Daily learning loop

Each study day uses a consistent two-to-three-hour format:

1. **Recall — 10 minutes:** explain yesterday's model without opening the documents.
2. **Focused reading — 35 to 50 minutes:** read only the assigned sections and mark claims, decisions, assumptions, and gates.
3. **Reconstruction — 35 to 50 minutes:** draw or write the design without copying sentences.
4. **Traceability — 20 to 30 minutes:** connect a business rule to data, module ownership, tests, and the relevant plan.
5. **Teach-back — 15 to 20 minutes:** explain the topic aloud as if speaking to a developer or clinic stakeholder.
6. **Defense — 15 to 20 minutes:** answer review questions and record anything that cannot yet be justified.
7. **Learning log — 10 minutes:** record what changed in the learner's understanding and what requires follow-up.

AI may ask questions, challenge assumptions, and assess answers, but it should not write the learner's first explanation or first diagram.

## 9. Six-week curriculum

### Week 1 — Project model, requirements, and Tech Lead controls

**Question of the week:** What problem is SkinLab solving, for whom, within what limits, and who is allowed to decide?

**Read in order:**

1. `docs/CONTEXT.md`.
2. `docs/governance/README.md` and `PROJECT_CHARTER.md`.
3. System/Architecture Design sections 1–5 and 18–20.
4. Project Governance Design sections 1–8.
5. `ROLES_RACI.md`, `RISK_REGISTER.md`, and both phase-completion records.

**Concepts:** stakeholder, functional/non-functional requirement, scope, non-goal, constraint, authority, risk, gate, Definition of Ready, Definition of Done, change control.

**Exercises and outputs:**

- Write a one-page SkinLab narrative for a new developer.
- Build a scope/non-goal/constraint table.
- Draw the actor and decision-rights map.
- Map the two project-control phases and the technical phases 0–6.
- Explain why Phase B can be complete while implementation remains on hold.

**Defense questions:**

- Why is channel integration outside the MVP?
- Who may change package definitions, clinical content, price, or stock variance?
- What does the external-review gate prevent?
- Which decision would require an ADR rather than an ordinary backlog edit?

**Week exit evidence:** the learner can explain SkinLab's purpose, scope, stakeholders, current state, and governance in ten minutes without notes.

### Week 2 — Appointment vertical slice and System Design fundamentals

**Question of the week:** How does a real clinic scheduling problem become states, rules, data, interfaces, and tests?

**Read in order:**

1. System/Architecture Design section 6.
2. Relevant entities in section 12 and consistency/testing sections 13 and 17.
3. A0 Appointment Prototype plan.
4. Appointments and Queue plan.
5. Appointment rows in the traceability and dependency matrices.

**Concepts:** workflow, state machine, invariant, aggregate boundary, capacity, scheduling policy, concurrency, idempotent job, happy path, exception path, acceptance journey.

**Exercises and outputs:**

- Draw appointment and queue state machines.
- Draw the T−10, T+15, and 19:00 timeline.
- Model booked, walk-in, late, no-show, cancellation, and rescheduling cases.
- Produce a conceptual appointment data model.
- Trace one booking rule to its API/module owner, database constraint, unit/integration test, and E2E journey.

**Defense questions:**

- Why does priority release at T+15 not cancel the appointment?
- Why can reception not independently declare clinical urgency?
- How does the design protect a booked patient while using safe gaps?
- What race condition exists when two reception actions book the same doctor?
- What should A0 validate, and what must it deliberately not claim?

**Week exit evidence:** the learner can defend the appointment design and identify at least five edge cases without reading the plan.

### Week 3 — Clinical records, treatment courses, and immutable history

**Question of the week:** How does SkinLab preserve clinical safety and history while allowing legitimate correction and treatment-plan flexibility?

**Read in order:**

1. System/Architecture Design sections 7 and 8.
2. Clinical/treatment entities in section 12 and security rules in section 14.
3. Clinical Records and Treatment Courses plan.
4. Compliance Plan Tasks 1–2 for consent and policy prerequisites.

**Concepts:** longitudinal record, encounter, aggregate, confirmation, immutable completion, amendment, versioning, provenance, primary-doctor continuity, entitlement boundary, privacy policy.

**Exercises and outputs:**

- Draw the encounter/clinical-record lifecycle.
- Write the invariants for the eight record sections and doctor confirmation.
- Compare draft edit, completion, amendment, and paper migration.
- Draw package purchase versus treatment-course ownership without mixing their responsibilities.
- Create a permission matrix for reception, doctor, and admin.

**Defense questions:**

- Why not allow an administrator to edit clinical content?
- Why preserve old content after an amendment?
- Why may the clinical record close before stock reconciliation?
- How can a doctor redistribute services without changing entitlement?
- What makes clinical-image access different from ordinary files?

**Week exit evidence:** the learner can explain clinical immutability, versioning, provenance, and module ownership with concrete SkinLab examples.

### Week 4 — Commercial and inventory consistency

**Question of the week:** How does the design prevent money, entitlement, medicine, and stock from becoming inconsistent?

**Read in order:**

1. System/Architecture Design sections 9–10 and relevant parts of sections 12–13.
2. Packages, Payments, and Receipts plan.
3. Inventory and Stocktake plan.
4. Cross-plan medicine flow in the dependency/gate matrix.

**Concepts:** snapshot, append-only ledger, reservation, consumption, compensation, transaction boundary, unit conversion, lot, expiry, FEFO, stock movement, reconciliation, correction-and-replacement.

**Exercises and outputs:**

- Draw the atomic package-purchase sequence.
- Draw the medicine draft → reserve → pay/receipt → dispense sequence.
- Create a table of failures and expected rollback/blocked behavior.
- Model item purchase units, base units, sale units, and treatment-use units.
- Explain how stock balance is derived from immutable movement history.

**Defense questions:**

- Why must medicine stock be reserved before payment?
- Why does receipt replacement not reverse payment or cancel the course?
- Why use a ledger instead of storing only `remainingSessions`?
- How does FEFO interact with expiry and near-expiry acknowledgement?
- What prevents two requests from consuming the same stock or entitlement?

**Week exit evidence:** the learner can identify transaction boundaries and defend ledger/reservation decisions across Commercial and Inventory.

### Week 5 — Architecture, database, security, reliability, and tests

**Question of the week:** How do the technical structures and quality controls make the business design safe to operate?

**Read in order:**

1. System/Architecture Design sections 11–17 and 20–22.
2. Foundation plan, first for task outcomes and interfaces, then for detailed steps only where needed.
3. ADR-0001 and Repository/Git Policy.
4. Compliance Plan Tasks 5–7 for readiness and production gates.

**Concepts:** architecture style, logical container, modular monolith, deep module, port/adapter, dependency direction, conceptual/logical/physical data model, transaction, authentication versus authorization, OIDC/BFF/session, trust boundary, mTLS, defense in depth, RTO, RPO, backup, restore, observability, test pyramid.

**Exercises and outputs:**

- Draw C4-style system-context and container diagrams.
- Draw backend module dependencies and mark forbidden table writes.
- Translate five conceptual entities into a proposed logical schema, constraints, and indexes without implementing them.
- Draw the login/device/gateway/API trust path.
- Explain the RTO/RPO recovery design and what the zero-cost staging topology does not prove.
- Map unit, integration, E2E, recovery, and SME/UAT evidence to risks.

**Defense questions:**

- Why modular monolith rather than microservices?
- Why is PostgreSQL the system of record while images use object storage?
- Why is a valid token insufficient without access/device context?
- What does RPO 15 minutes mean during a real incident?
- Why is a backup not considered valid until a restore drill succeeds?
- Which architecture choices remain provisional for production?

**Week exit evidence:** the learner can present the container/module architecture, database approach, trust boundaries, recovery targets, and test strategy without confusing design with implementation.

### Week 6 — Plans, trade-offs, revalidation, and architecture defense

**Question of the week:** Can the learner lead a review, defend the baseline, admit uncertainty, and decide what evidence is needed next?

**Read in order:**

1. MVP Plan Index.
2. Traceability, dependency/gate, and review matrices.
3. The goals, interfaces, review focus, and phase gates of Plans 1–6; detailed task steps only for sampled questions.
4. Change Control, ADR Index/template, Delivery Quality, and review records.

**Concepts:** roadmap versus executable plan, dependency graph, revalidation, architectural fitness evidence, trade-off, reversibility, risk acceptance, change trigger, decision record, go/no-go.

**Exercises and outputs:**

- Build a requirement → design → module → plan → test → gate traceability example for each MVP domain.
- Explain the full delivery order and why plan numbers are not a strictly sequential command.
- Write three hypothetical change requests and decide whether each needs backlog edit, plan revalidation, or ADR.
- Prepare a 15-minute design presentation with no more than ten slides or equivalent diagrams.
- Complete a 30-minute mock architecture defense and create a gap-remediation log.

**Defense questions:**

- Which decision would you change first if the clinic opened a second branch?
- What evidence would allow real patient data in staging?
- Which module boundary is most important to preserve and why?
- Where could the current plan be over-engineered for one clinic?
- Which assumptions must be revalidated before Plan 2?
- What would make you reject a production go-live even if all feature tests passed?

**Week exit evidence:** the learner passes the final rubric and can distinguish a confident design decision from a provisional assumption requiring evidence.

## 10. Learning artifacts

The curriculum will create a durable but non-authoritative learning area:

```text
docs/learning/
├── README.md
├── progress.md
├── glossary.md
├── questions-and-gaps.md
├── week-01-project-and-governance.md
├── week-02-appointments.md
├── week-03-clinical-treatment.md
├── week-04-commercial-inventory.md
├── week-05-architecture-platform.md
├── week-06-defense.md
├── diagrams/
└── assessments/
```

Learning notes do not override approved specs, governance, ADRs, or plans. Corrections to an authoritative document must follow change control rather than being made indirectly through a learning note.

## 11. Assessment model

### Weekly assessment

Each week is scored on four dimensions, each from 0 to 5:

1. **Accuracy:** statements match approved project sources.
2. **Connection:** business rules are connected to data, modules, tests, and gates.
3. **Reasoning:** trade-offs and rejected alternatives are explained.
4. **Communication:** the explanation is clear to both technical and clinic stakeholders.

A week is complete at 14/20 or higher with no dimension below 3. A lower score leads to targeted remediation, not repetition of the whole week.

### Final Tech Lead defense rubric

| Area                                                 | Weight |
| ---------------------------------------------------- | -----: |
| Problem, scope, stakeholders, and governance         |    10% |
| Workflows, state, invariants, and domain model       |    20% |
| Containers, modules, interfaces, and data ownership  |    20% |
| Database, consistency, transactions, and concurrency |    15% |
| Security, privacy, reliability, and operations       |    15% |
| Testing, delivery order, migration, and gates        |    10% |
| Trade-off reasoning and review communication         |    10% |

The target is at least 75/100, with no major area below 60%, and no critical misunderstanding that would authorize real data, weaken clinical immutability, bypass inventory/payment safeguards, or close an external gate without evidence.

## 12. Knowledge calibration

The roadmap separates four levels of understanding:

1. **Recall:** name the selected decision.
2. **Explain:** describe why it exists and what problem it solves.
3. **Apply:** use the principle on a new SkinLab scenario.
4. **Defend:** compare alternatives, describe consequences, identify missing evidence, and change position when facts justify it.

The final target is level 4 for the approved MVP baseline. Implementation and production experience will still be required before claiming independent senior Tech Lead proficiency.

## 13. Coaching rules

- Questions come before corrections; the learner explains first.
- Feedback distinguishes factual error, incomplete reasoning, and communication weakness.
- Every answer should cite or point to an authoritative project source.
- Diagrams are redrawn from understanding rather than copied.
- AI supplies hints progressively and records recurring misconceptions.
- Unknowns are acceptable when clearly labeled with the evidence needed to decide.
- No study exercise may lift the execution hold or mutate product/infrastructure state.

## 14. Completion criteria

The learning roadmap is complete when:

- all six weekly artifacts and diagrams exist;
- weekly assessments meet their thresholds;
- unresolved questions are classified as misunderstanding, revalidation item, or external gate;
- the learner completes the 15-minute presentation and 30-minute defense;
- the final score meets the rubric threshold; and
- a retrospective identifies what must be learned during actual Foundation and vertical-slice implementation.
