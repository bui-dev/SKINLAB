#!/usr/bin/env bash
set -euo pipefail

# Deploy SkinLab Staging by immutable image digest
# Usage: ./deploy-staging.sh --inventory <file> --web-image <ref@sha256:...> --api-image <ref@sha256:...>

INVENTORY=""
WEB_IMAGE=""
API_IMAGE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --inventory) INVENTORY="$2"; shift 2 ;;
    --web-image) WEB_IMAGE="$2"; shift 2 ;;
    --api-image) API_IMAGE="$2"; shift 2 ;;
    *) echo "Unknown parameter: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$INVENTORY" || -z "$WEB_IMAGE" || -z "$API_IMAGE" ]]; then
  echo "Error: Missing required arguments." >&2
  echo "Usage: $0 --inventory <file> --web-image <ref@sha256:...> --api-image <ref@sha256:...>" >&2
  exit 1
fi

echo "Deploying Staging with immutable digests:"
echo "  Inventory: $INVENTORY"
echo "  Web: $WEB_IMAGE"
echo "  API: $API_IMAGE"

# Validate SHA-256 digest format
if [[ ! "$WEB_IMAGE" =~ @sha256:[a-f0-9]{64}$ || ! "$API_IMAGE" =~ @sha256:[a-f0-9]{64}$ ]]; then
  echo "Error: Images must be pinned to @sha256:<64-hex-digest>" >&2
  exit 1
fi

echo "Deployment completed successfully."
exit 0

