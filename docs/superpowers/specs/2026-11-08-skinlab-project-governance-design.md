# SkinLab MVP Project Governance Design

**Status:** Approved by the Project Sponsor and Product Owner on 2026-11-08  
**Applies to:** Project initiation through the MVP Internal Pilot  
**Owner:** Project Sponsor / Product Owner

## 1. Purpose

This design establishes how SkinLab is governed before engineering begins. It defines decision authority, delivery cadence, quality gates, change control, repository policy, budget constraints, and risk controls for a one-person development team supported by AI agents.

The governance model is intentionally lightweight, but it does not relax controls for clinical data, security, recovery, compliance, or production release.

## 2. Operating context

- The Project Sponsor, Product Owner, Engineering Coordinator, and sole developer are currently the same person.
- The developer has frontend experience and is learning backend development while building SkinLab.
- No qualified Human/Fractional Tech Lead has been appointed.
- A receptionist and a doctor can participate as Business SME and Clinical SME.
- Codex sub-agents may support technical, QA, DevOps, and security work, but cannot be accountable approvers.
- Development is full-time.
- Incremental cash spend is zero through fake-data staging, excluding the existing Codex subscription.
- The available Ubuntu Server VM on a separate MacBook is a development/staging resource, not an approved production platform.

## 3. Governance principles

1. A human remains accountable for every business, technical, financial, and release decision.
2. AI output is evidence or advice, never formal approval.
3. The absence of a Tech Lead blocks real patient data and production, not learning or fake-data development.
4. Paper records remain legally authoritative until compliance review permits replacement.
5. Quality gates are based on evidence, not declarations that a feature “works.”
6. Changes are traceable through Issues, pull requests, ADRs, test results, and review records.
7. The same code artifact is promoted between environments; environment-specific configuration is externalized.
8. Work in progress is limited to protect focus and quality in a one-person team.

## 4. Roles and authority

| Role                       | Assignment              | Authority                                                                            |
| -------------------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| Project Sponsor            | Project owner           | Budget, risk acceptance, go/no-go                                                    |
| Product Owner              | Project owner           | Scope, priority, acceptance criteria, business acceptance                            |
| Engineering Coordinator    | Project owner           | Daily coordination, technical evidence, and provisional fake-data technical approval |
| Developer                  | Project owner           | Frontend/backend implementation and testing                                          |
| Human/Fractional Tech Lead | Unassigned              | Independent technical approval; gate remains closed while unassigned                 |
| Business SME               | Designated receptionist | Consulted on scheduling, reception, payment, and inventory workflows                 |
| Clinical SME               | Designated doctor       | Consulted on clinical records and treatment workflows                                |
| AI specialist agents       | Codex sub-agents        | Advisory implementation/review support only                                          |

The Engineering Coordinator is the accountable human for provisional architecture, security, and data decisions that affect only local/fake-data staging. Those decisions require an ADR and independent AI review. They are not ratified for real data or production until the applicable external gate closes. The Project Sponsor cannot waive mandatory external technical or compliance gates merely by accepting the risk.

## 5. Delivery model

### 5.1 Milestones

- **A0 – Appointment Prototype:** one week, fake data, local/staging only.
- **MVP Internal Pilot:** completion date is forecast after three two-week sprints using measured velocity.
- **Production:** no committed date and blocked until all external gates are satisfied.

### 5.2 Cadence

- A0 is a dedicated one-week sprint.
- Subsequent work uses two-week sprints.
- Each sprint includes planning, implementation, review, SME demonstration, Product Owner acceptance, and a short retrospective.
- One receptionist and one doctor review affected workflows for 30–60 minutes at the end of a sprint.

### 5.3 Work-in-progress limits

- Maximum one item in implementation.
- Maximum one additional item waiting for review.
- Blocked work must record the blocker and next action before another item starts.

## 6. Backlog workflow

```text
Backlog → Ready → In Progress → In Review → Staging → Accepted → Done
```

Additional terminal/interruption states are `Blocked` and `Cancelled`.

An item may enter `Ready` only when it contains a goal, business value, acceptance criteria, non-goals, dependencies, data classification, test approach, and known risks.

## 7. Quality model

An item is `Done` only when:

- acceptance criteria are met;
- lint, typecheck, and relevant tests pass;
- critical domain logic has automated tests;
- an AI reviewer independent of the implementation agent has reviewed the change;
- no known critical defect or critical security issue remains;
- database migrations are tested when applicable;
- no secrets or real patient data are committed or used;
- affected specifications, ADRs, runbooks, and review records are current;
- staging deployment succeeds when the item forms a usable feature;
- affected SME review is recorded; and
- the Product Owner accepts the result.

Prototype functions must identify mocked or simulated behavior and may not be represented as production-ready.

## 8. Change control

- Implementation-only changes are documented in the pull request.
- Business scope or workflow changes require Product Owner approval and updates to the specification/backlog.
- Architecture, security, data, or infrastructure changes require an ADR, Engineering Coordinator provisional approval, and AI technical/security review.
- Any change involving real data or production requires independent external approval.
- Oral requests are not implemented until recorded in the backlog.

## 9. Repository and release model

`/Users/admin/Documents/Docker/SKINLAB` will become the fresh Git and pnpm workspace root. The active monorepo preserves current source files but does not import the old `admin-skinlab` Git history.

```text
SKINLAB/
├── admin-skinlab/
├── api-skinlab/
├── packages/
├── docker/
└── docs/
```

- `docs/` is the official location for specifications, ADRs, plans, reviews, runbooks, and governance.
- The nested `admin-skinlab/.git` metadata is removed during Engineering Foundation after a clean-state check.
- A new remote is created for the monorepo; the existing frontend remote is not overwritten.
- Branch promotion is `feature/* → dev → stg → main`.
- `stg` deploys to the fake-data Ubuntu VM environment.
- `main` represents production-approved state but does not itself waive release gates.
- No environment contains code changes unique to that environment.
- Staging-tested artifacts are promoted by immutable digest rather than rebuilt for production.

## 10. Budget policy

- Zero incremental cash expenditure through fake-data staging, excluding the existing Codex subscription.
- Existing devices and open-source software are used for development/staging.
- No domain is required during this stage.
- Free cloud services are not introduced merely to claim zero cost when they increase lock-in, operational complexity, or billing risk.
- A qualified pro-bono reviewer is acceptable.
- If no qualified free reviewer is available, production remains blocked until the Sponsor approves an external-review budget.

## 11. Mandatory gates

Development with fake data may continue while these gates are open. Real patient data or production may not proceed until all applicable gates close:

1. Independent technical architecture/security review.
2. Compliance and legal review for electronic clinical records and personal data.
3. Proven backup and restore meeting RTO 4 hours / RPO 15 minutes.
4. UAT by clinic representatives.
5. Security, access-control, and audit evidence.
6. Product Owner and Sponsor go/no-go decision after the above evidence exists.

## 12. Completion of Phase A

Phase A is complete when the operational governance documents derived from this design are published, independently reviewed, internally consistent, and linked from the governance index. Open delivery risks remain tracked; Phase A completion does not imply production readiness.
