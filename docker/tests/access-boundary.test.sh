#!/usr/bin/env bash
set -euo pipefail

echo "=== Running Access Boundary Policy Test ==="
CADDYFILE="docker/staging/Caddyfile"

if [[ ! -f "$CADDYFILE" ]]; then
  echo "FAIL: $CADDYFILE does not exist!" >&2
  exit 1
fi

echo "1. Checking mTLS client verification on port 443..."
if ! grep -q "client_auth {" "$CADDYFILE" || ! grep -q "mode require_and_verify" "$CADDYFILE"; then
  echo "FAIL: Caddy does not enforce require_and_verify client authentication!" >&2
  exit 1
fi
if ! grep -q "trust_pool file /run/secrets/clinic-device-ca-bundle.pem" "$CADDYFILE"; then
  echo "FAIL: Ingress trust pool missing clinic-device-ca-bundle.pem!" >&2
  exit 1
fi
echo "  -> External listener mTLS requirement verified: PASS"

echo "2. Checking caller header stripping (anti-spoofing)..."
STRIP_HEADERS=(
  "request_header -X-SkinLab-Gateway-Assertion"
  "request_header -X-SkinLab-Verified-Device-Fingerprint"
  "request_header -X-SkinLab-Verified-Access-Context"
)

for hdr in "${STRIP_HEADERS[@]}"; do
  if ! grep -q -F "$hdr" "$CADDYFILE"; then
    echo "FAIL: Caddy does not strip spoofable header: $hdr!" >&2
    exit 1
  fi
done
echo "  -> Caller context headers stripped before signing: PASS"

echo "3. Checking context separation (WireGuard vs Clinic)..."
if ! grep -q "@authFromWireguard" "$CADDYFILE" || ! grep -q "remote_ip 10.13.13.0/24" "$CADDYFILE"; then
  echo "FAIL: WireGuard remote context routing rule missing!" >&2
  exit 1
fi

if ! grep -q "@authFromClinic" "$CADDYFILE" || ! grep -q "not remote_ip 10.13.13.0/24" "$CADDYFILE"; then
  echo "FAIL: Clinic context routing rule missing!" >&2
  exit 1
fi
echo "  -> Context routing (clinic vs remote) verified: PASS"

echo "4. Checking forward_auth to context-signer..."
if ! grep -q "forward_auth https://context-signer:8443" "$CADDYFILE"; then
  echo "FAIL: Forward auth to context-signer missing in $CADDYFILE!" >&2
  exit 1
fi
echo "  -> Forward auth to context-signer verified: PASS"

echo "5. Checking internal listener (port 9443) mTLS..."
if ! grep -q "https://:9443" "$CADDYFILE" || ! grep -q "/run/secrets/bff-client-ca.pem" "$CADDYFILE"; then
  echo "FAIL: Internal port 9443 listener with bff-client-ca missing!" >&2
  exit 1
fi
echo "  -> Internal BFF listener isolation verified: PASS"

echo "=== Access Boundary Policy Test: ALL PASS ==="
exit 0

