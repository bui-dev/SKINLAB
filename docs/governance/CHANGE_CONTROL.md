# Change Control and Decision Policy

## Change classes

| Class                           | Examples                                                              | Required action                                | Approver                                                                                         |
| ------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| C1 — Implementation             | Refactor, internal naming, test organization without behavior change  | PR notes and tests                             | Engineering Coordinator                                                                          |
| C2 — Product                    | Workflow, role behavior, acceptance criterion, MVP scope              | Update Issue/spec and record decision          | Product Owner                                                                                    |
| C3 — Architecture/Security/Data | Module boundary, database ownership, auth, audit, storage, deployment | ADR + independent AI technical/security review | Engineering Coordinator for provisional fake-data use; external gate before real data/production |
| C4 — Production/Compliance      | Real data, legal authority, retention, go-live, recovery target       | Formal review evidence and go/no-go record     | Sponsor after mandatory external gates                                                           |

## Change request lifecycle

```text
Proposed → Impact assessed → Approved/Rejected → Planned → Implemented → Verified → Closed
```

Every C2–C4 change records:

- problem and requested outcome;
- affected scope, users, data, plans, and milestones;
- security/compliance implications;
- schedule and budget impact;
- alternatives considered;
- decision owner and date;
- implementation evidence; and
- superseded documents or ADRs.

The Engineering Coordinator may approve a C3 decision only for local/fake-data staging. Its ADR uses `Status: Accepted` with `Approval scope: Provisional — fake-data local/staging only; not ratified for real data/production`. Ratification requires the applicable external technical and compliance evidence.

## ADR triggers

Create an ADR when a decision:

- changes repository/application/module boundaries;
- selects or replaces a durable platform or data store;
- affects authentication, authorization, audit, encryption, or secrets;
- changes data ownership, immutability, retention, or recovery;
- changes environment/release topology;
- is expensive to reverse; or
- resolves a recurring technical disagreement.

Do not create an ADR for routine code structure that is local, inexpensive to reverse, and covered by existing standards.

## Oral requests

An oral request may be discussed immediately but is not implemented until recorded as an Issue or change record. Urgency changes priority, not traceability.

## Emergency changes

Production emergency changes are not active during fake-data development. Before production, a separate incident/emergency change runbook must define authority, rollback, logging, review-after-change, and synchronization back through `main`, `stg`, and `dev`.
