# Roles, Decision Rights, and RACI

## Role assignments

| Role                         | Current assignment      | Notes                                              |
| ---------------------------- | ----------------------- | -------------------------------------------------- |
| Project Sponsor              | Project owner           | Accountable for budget and project risk            |
| Product Owner                | Project owner           | Accountable for scope and business acceptance      |
| Engineering Coordinator      | Project owner           | Coordinates delivery and evidence                  |
| Developer                    | Project owner           | Implements frontend/backend and tests              |
| Human/Fractional Tech Lead   | Unassigned              | Production technical gate remains closed           |
| Business SME                 | Designated receptionist | Named person selected before first affected review |
| Clinical SME                 | Designated doctor       | Named person selected before first affected review |
| External Compliance Reviewer | Unassigned              | Required before electronic records replace paper   |
| AI Technical Reviewer        | Codex sub-agent         | Advisory only                                      |
| AI QA Reviewer               | Codex sub-agent         | Advisory and test evidence only                    |
| AI DevOps Reviewer           | Codex sub-agent         | Advisory and automation evidence only              |
| AI Security Reviewer         | Codex sub-agent         | Advisory and security findings only                |

## RACI key

- **R — Responsible:** performs the work.
- **A — Accountable:** owns the decision or outcome; exactly one human role per row where practical.
- **C — Consulted:** provides input before the decision.
- **I — Informed:** receives the outcome.
- **G — Mandatory gate:** must provide independent evidence/approval before the action may proceed.

## RACI matrix

| Activity                                                          | Sponsor | Product Owner | Eng. Coordinator / Developer | Business SME | Clinical SME | External technical reviewer | Compliance reviewer     | AI agents |
| ----------------------------------------------------------------- | ------- | ------------- | ---------------------------- | ------------ | ------------ | --------------------------- | ----------------------- | --------- |
| Approve project budget                                            | A/R     | I             | I                            | I            | I            | I                           | I                       | I         |
| Define and prioritize scope                                       | I       | A/R           | C                            | C            | C            | I                           | C                       | C         |
| Write acceptance criteria                                         | I       | A             | R                            | C            | C            | I                           | I                       | C         |
| Implement and test                                                | I       | I             | A/R                          | I            | I            | C                           | I                       | C         |
| Accept reception/inventory workflow                               | I       | A             | R                            | C            | I            | I                           | I                       | C         |
| Accept clinical workflow                                          | I       | A             | R                            | I            | C            | I                           | C                       | C         |
| Approve provisional fake-data architecture change                 | I       | C             | A/R                          | I            | I            | C                           | C                       | C         |
| Approve provisional fake-data security/data-control change        | I       | C             | A/R                          | I            | I            | C                           | C                       | C         |
| Ratify architecture/security controls for real data or production | I       | C             | R                            | I            | I            | G                           | G when legally relevant | C         |
| Deploy fake-data staging                                          | I       | A             | R                            | I            | I            | C                           | I                       | C         |
| Permit real patient data                                          | A       | C             | R                            | I            | C            | G                           | G                       | C         |
| Production go/no-go                                               | A/R     | C             | C                            | C            | C            | G                           | G                       | C         |
| Declare paper no longer authoritative                             | A       | C             | I                            | I            | C            | I                           | G                       | I         |

## Separation rules

- The same AI agent must not both implement and perform the final AI review of a change.
- AI agents cannot be `A` or satisfy `G`.
- The Product Owner may accept business behavior but does not self-certify independent technical or compliance gates.
- The Engineering Coordinator is accountable only for provisional decisions limited to local/fake-data staging; an accepted ADR and independent AI review are required.
- While the Tech Lead role is unassigned, fake-data development may proceed and production remains blocked.
