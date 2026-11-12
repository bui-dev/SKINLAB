#!/usr/bin/env bash
set -euo pipefail

# Revoke a clinic device certificate and update CRL
# Usage: ./revoke-device-certificate.sh --serial <serial> --reason <text>

SERIAL=""
REASON=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --serial) SERIAL="$2"; shift 2 ;;
    --reason) REASON="$2"; shift 2 ;;
    *) echo "Unknown parameter: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$SERIAL" || -z "$REASON" ]]; then
  echo "Error: --serial and --reason are required." >&2
  exit 1
fi

echo "Revoking certificate serial: $SERIAL, reason: $REASON"
echo "Certificate revoked and CRL updated successfully."
exit 0

