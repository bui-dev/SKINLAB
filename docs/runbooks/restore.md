# Runbook: Disaster Recovery & Point-In-Time Restore (PITR)

## 1. Objective
Restore the PostgreSQL database and MinIO object storage to an exact historical target time
with RTO < 4 hours and RPO <= 15 minutes.

## 2. Execution Command
```bash
./docker/scripts/restore-drill.sh \
  --environment staging \
  --target-time "2026-11-12T09:00:00Z"
```

## 3. Verification
Check machine-readable recovery evidence in `artifacts/operations/restore-drill-evidence.json`.
Confirm that:
- `databaseChecksumMatch` is `true`
- `objectStorageChecksumMatch` is `true`
- `measuredRtoSeconds` is well within the 4-hour RTO threshold
- `measuredRpoMinutes` is within the 15-minute RPO threshold

