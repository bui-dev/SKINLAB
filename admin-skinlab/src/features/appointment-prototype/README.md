# A0 Appointment Prototype

> **A0 PROTOTYPE — FAKE DATA — NOT FOR PRODUCTION**

## Purpose

This disposable prototype helps a receptionist and doctor validate the appointment and day-of-queue workflow before production implementation.

## Scope

- Fake scheduling labels and deterministic timestamps only.
- Feature-local, in-memory behavior under `/prototype/appointments`.
- Workflow learning takes priority over reusable production code.

## Exclusions

- No real patient identifiers, clinical data, images, payment evidence, or secrets.
- No backend, database, authentication, external messaging, or production deployment.
- No claim that prototype scheduling heuristics are production-ready.

## Disposal rule

Prototype application code must not merge into `dev`, `stg`, or `main`. After receptionist, doctor, and Product Owner review, tag and archive the prototype branch. Only accepted workflow findings and documentation return through a separate docs-only pull request. Any proposed code reuse requires a new production task and the normal Definition of Done.
