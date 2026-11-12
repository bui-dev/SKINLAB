# Architecture Decision Records

ADRs capture durable technical decisions that are costly to reverse or affect architecture, security, data, or release topology.

## Status values

- Proposed
- Accepted
- Superseded
- Rejected

Status describes the ADR lifecycle. Approval scope is recorded separately:

- **Ratified:** approved for the environments and data classes stated by the ADR.
- **Provisional — fake-data local/staging only:** accepted for learning and fake-data delivery but not approved for real patient data or production.

An external technical/compliance review may expand a provisional ADR's scope. Record that change in the ADR and review evidence; do not silently change the original approval basis.

## Index

- [ADR-0001: Fresh root pnpm monorepo](./0001-fresh-root-pnpm-monorepo.md) — Accepted; Ratified for repository structure
- [ADR-0002: Identity, session, and access boundary](./0002-identity-session-and-access-boundary.md) — Accepted; Provisional — fake-data local/staging only
- [ADR-0003: Fake-data staging and artifact promotion](./0003-fake-data-staging-and-artifact-promotion.md) — Accepted; Provisional — fake-data local/staging only
- [ADR template](./0000-template.md)

New ADRs use the next four-digit number and a short kebab-case title.
