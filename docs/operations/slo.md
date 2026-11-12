# Service Level Objectives (SLO) & Disaster Recovery Commitments

## 1. Recovery Targets
- **RTO (Recovery Time Objective):** < 4 hours.
  Total elapsed duration from disaster declaration to full service availability.
- **RPO (Recovery Point Objective):** <= 15 minutes.
  Maximum tolerable data loss interval achieved via pgBackRest continuous WAL archiving.

## 2. Availability Targets
- Staging Uptime: 99.0% (provisional, business hours).
- Clinic API Availability: 99.9% target.

## 3. Staging Data Boundary
- Synthetic data only (100% fake accounts and records).
- Real patient medical records, personal identity data, or images are strictly forbidden.

