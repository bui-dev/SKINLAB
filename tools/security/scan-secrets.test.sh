#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
SCANNER="$ROOT_DIR/tools/security/scan-secrets.sh"

if [[ ! -x "$SCANNER" ]]; then
  echo "Secret scanner is missing or not executable: $SCANNER" >&2
  exit 1
fi

FIXTURE_DIR="$(mktemp -d /tmp/skinlab-secret-scan.XXXXXX)"
trap 'rm -rf "$FIXTURE_DIR"' EXIT

PRIVATE_KEY_LABEL=' PRIVATE KEY-----'
{
  printf '%s%s\n' '-----BEGIN RSA' "$PRIVATE_KEY_LABEL"
  printf '%s\n' 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
  printf '%s%s\n' '-----END RSA' "$PRIVATE_KEY_LABEL"
} > "$FIXTURE_DIR/synthetic.pem"

if "$SCANNER" "$FIXTURE_DIR"; then
  echo "Expected the synthetic credential fixture to be rejected." >&2
  exit 1
fi

rm "$FIXTURE_DIR/synthetic.pem"
"$SCANNER" "$FIXTURE_DIR"
"$SCANNER" "$ROOT_DIR"
