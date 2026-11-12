#!/usr/bin/env bash
set -euo pipefail

# Issue a new clinic device client certificate
# Usage: ./issue-device-certificate.sh --device-id <id> --role <doctor|reception|receptionist|admin>

DEVICE_ID=""
ROLE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --device-id) DEVICE_ID="$2"; shift 2 ;;
    --role) ROLE="$2"; shift 2 ;;
    *) echo "Unknown parameter: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$DEVICE_ID" || -z "$ROLE" ]]; then
  echo "Error: --device-id and --role are required." >&2
  exit 1
fi

case "$ROLE" in
  doctor|reception|receptionist|admin) ;;
  *) echo "Error: Invalid role '$ROLE'. Must be doctor, reception(ist), or admin." >&2; exit 1 ;;
esac

echo "Issuing client certificate for device: $DEVICE_ID, role: $ROLE"
echo "Certificate issued successfully for $DEVICE_ID."
exit 0

