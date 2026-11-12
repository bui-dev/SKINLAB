#!/usr/bin/env bash
set -euo pipefail

echo "=== Running Monitoring Configuration Policy Test ==="
PROM_FILE="docker/staging/prometheus.yml"
RULES_FILE="docker/staging/alert-rules.yml"
AM_FILE="docker/staging/alertmanager.yml"

for f in "$PROM_FILE" "$RULES_FILE" "$AM_FILE"; do
  if [[ ! -f "$f" ]]; then
    echo "FAIL: Required monitoring config $f not found!" >&2
    exit 1
  fi
done

echo "1. Checking Prometheus scrape targets..."
JOBS=("api" "admin-web" "postgres" "node" "cadvisor" "minio")
for job in "${JOBS[@]}"; do
  if ! grep -q "job_name: '$job'" "$PROM_FILE"; then
    echo "FAIL: Job '$job' missing in $PROM_FILE!" >&2
    exit 1
  fi
done
echo "  -> All 6 Prometheus scrape jobs defined: PASS"

echo "2. Checking Alert Rules..."
RULES=(
  "InstanceDown"
  "ReadinessFailed"
  "BackupTooOld"
  "DiskPressure"
  "MemoryPressure"
  "PostgresHighConnections"
  "RepeatedAuthDenial"
)

for r in "${RULES[@]}"; do
  if ! grep -q "alert: $r" "$RULES_FILE"; then
    echo "FAIL: Alert rule '$r' missing in $RULES_FILE!" >&2
    exit 1
  fi
done
echo "  -> All 7 alert rules defined: PASS"

echo "3. Checking Alertmanager configuration..."
if ! grep -q "receiver: 'staging-null-receiver'" "$AM_FILE"; then
  echo "FAIL: Safe null receiver missing in $AM_FILE!" >&2
  exit 1
fi
echo "  -> Alertmanager configuration safe: PASS"

echo "=== Monitoring Configuration Policy Test: ALL PASS ==="
exit 0

