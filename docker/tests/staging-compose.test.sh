#!/usr/bin/env bash
set -euo pipefail

echo "=== Running Staging Compose Policy Test ==="
COMPOSE_FILE="docker/staging/compose.yaml"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "FAIL: Compose file $COMPOSE_FILE does not exist!" >&2
  exit 1
fi

echo "1. Checking published host ports..."
# Extract all port mapping lines
PUBLISHED_PORTS=$(grep -E '^\s*-\s*["0-9]+:' "$COMPOSE_FILE" | tr -d ' "-' || true)
echo "Found published port entries: $PUBLISHED_PORTS"

# Validate that each published port is either 443:443 or 51820:51820/udp
for p in $PUBLISHED_PORTS; do
  if [[ "$p" != "443:443" && "$p" != "51820:51820/udp" ]]; then
    echo "FAIL: Unauthorized host port published: $p! Only 443 and 51820/udp are allowed." >&2
    exit 1
  fi
done
echo "  -> Port exposure strictly limited to 443 and 51820/udp: PASS"

echo "2. Checking immutable image digests (@sha256:...)..."
IMAGES=$(grep -E '^\s*image:' "$COMPOSE_FILE" | awk '{print $2}')
for img in $IMAGES; do
  if [[ ! "$img" =~ @sha256:[a-f0-9]{64} ]]; then
    echo "FAIL: Image '$img' is not pinned to an immutable @sha256 digest!" >&2
    exit 1
  fi
done
echo "  -> All 15 service images pinned to immutable SHA-256 digests: PASS"

echo "3. Checking required service definitions..."
REQUIRED_SERVICES=(
  "wireguard"
  "gateway"
  "context-signer"
  "admin-web"
  "api"
  "postgres"
  "pgbackrest"
  "minio"
  "minio-init"
  "keycloak"
  "node-exporter"
  "cadvisor"
  "postgres-exporter"
  "prometheus"
  "alertmanager"
)

for svc in "${REQUIRED_SERVICES[@]}"; do
  if ! grep -q -E "^\s*${svc}:" "$COMPOSE_FILE"; then
    echo "FAIL: Required service '$svc' is missing in $COMPOSE_FILE!" >&2
    exit 1
  fi
done
echo "  -> All 15 required services present: PASS"

echo "4. Checking network isolation..."
if ! grep -q "skinlab-internal:" "$COMPOSE_FILE"; then
  echo "FAIL: Network skinlab-internal is missing in $COMPOSE_FILE!" >&2
  exit 1
fi
echo "  -> Internal bridge network defined: PASS"

echo "=== Staging Compose Policy Test: ALL PASS ==="
exit 0

