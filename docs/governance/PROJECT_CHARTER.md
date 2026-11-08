# Project Charter

## Project

**Name:** SkinLab Dermatology Clinic Operations System  
**Delivery target:** MVP Internal Pilot  
**Project Sponsor / Product Owner:** Project owner  
**Effective date:** 2026-11-08

## Purpose

SkinLab will reduce operational uncertainty and manual handling in appointment scheduling, clinical/treatment records, inventory, service packages, full payment, and internal receipts for one dermatology clinic.

## MVP outcome

The MVP must support the approved end-to-end clinic workflows while preserving clinical, financial, and inventory history. It must remain suitable for a one-clinic scale and must not introduce installments, debt, refunds, electronic invoices, communication-channel integration, reusable equipment, or multi-branch behavior.

## First delivery milestone

`A0 – Appointment Prototype` is delivered after one development week with fake data. It validates appointment, check-in, waiting, late/no-show, walk-in, and doctor-availability concepts. It is not an operational pilot or production system.

After A0, delivery uses two-week sprints. The `MVP Internal Pilot` forecast is established after three sprints using measured throughput and remaining scope.

## Success measures

- Reception and a doctor can review and accept the intended scheduling workflow.
- Backlog items are traceable from acceptance criteria to tests and review evidence.
- Development/staging contains no real patient data.
- System design invariants remain enforceable in implementation plans and code.
- The team can deploy to and recover the fake-data staging environment.
- External technical and compliance gates are visible and cannot be silently bypassed.

## Constraints

- One full-time developer with frontend experience who is learning backend development.
- No appointed Human/Fractional Tech Lead.
- Zero incremental cash spend through fake-data staging, excluding Codex Plus.
- Existing Ubuntu VM is staging only.
- Paper remains the legally authoritative clinical record until approved otherwise.
- Online-only target with controlled paper fallback.
- RTO 4 hours and RPO 15 minutes remain production acceptance targets.

## In-scope stakeholders

- Project Sponsor / Product Owner.
- Engineering Coordinator / developer.
- Designated receptionist Business SME.
- Designated doctor Clinical SME.
- External technical and compliance reviewers when appointed.
- AI specialist agents as non-accountable support.

## Budget baseline

The approved baseline through fake-data staging is zero additional cash spend. Any paid service, domain, cloud resource, or external review requires Sponsor approval before purchase. A missing review budget does not permit bypassing a mandatory gate.

## Go/no-go authority

The Sponsor makes the final business go/no-go decision only after mandatory technical, compliance, UAT, security, and recovery evidence exists. The Sponsor may delay go-live but may not declare a mandatory gate satisfied without its required evidence.
