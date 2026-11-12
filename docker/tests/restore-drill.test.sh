#!/usr/bin/env bash
set -euo pipefail

echo "=== Running Disaster Recovery Restore Drill Test ==="
DRILL_SCRIPT="docker/scripts/restore-drill.sh"

if [[ ! -x "$DRILL_SCRIPT" && ! -f "$DRILL_SCRIPT" ]]; then
  echo "FAIL: Drill script $DRILL_SCRIPT not found!" >&2
  exit 1
fi

echo "1. Executing restore drill script..."
bash "$DRILL_SCRIPT" --environment disposable --target-time "2026-11-12T09:00:00Z"

EVIDENCE_FILE="artifacts/operations/restore-drill-evidence.json"
if [[ ! -f "$EVIDENCE_FILE" ]]; then
  echo "FAIL: Evidence file $EVIDENCE_FILE was not created!" >&2
  exit 1
fi
echo "  -> Drill execution completed and evidence file generated: PASS"

echo "2. Validating evidence file contents..."
grep -q '"status": "SUCCESS"' "$EVIDENCE_FILE" || { echo "FAIL: status != SUCCESS"; exit 1; }
grep -q '"rtoThresholdHours": 4' "$EVIDENCE_FILE" || { echo "FAIL: rtoThresholdHours != 4"; exit 1; }
grep -q '"rpoThresholdMinutes": 15' "$EVIDENCE_FILE" || { echo "FAIL: rpoThresholdMinutes != 15"; exit 1; }
grep -q '"databaseChecksumMatch": true' "$EVIDENCE_FILE" || { echo "FAIL: databaseChecksumMatch != true"; exit 1; }
grep -q '"objectStorageChecksumMatch": true' "$EVIDENCE_FILE" || { echo "FAIL: objectStorageChecksumMatch != true"; exit 1; }
echo "  -> Evidence JSON meets RTO/RPO and checksum criteria: PASS"

echo "=== Disaster Recovery Restore Drill Test: ALL PASS ==="
exit 0

