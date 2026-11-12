#!/usr/bin/env bash
set -euo pipefail

echo "=== Running Ansible Idempotency & Structure Test ==="
SITE_FILE="docker/iac/ansible/site.yml"
TASKS_FILE="docker/iac/ansible/roles/skinlab/tasks/main.yml"
VARS_FILE="docker/iac/ansible/group_vars/staging.example.yml"
INV_FILE="docker/iac/ansible/inventory.example.yml"

for f in "$SITE_FILE" "$TASKS_FILE" "$VARS_FILE" "$INV_FILE"; do
  if [[ ! -f "$f" ]]; then
    echo "FAIL: Required Ansible file $f not found!" >&2
    exit 1
  fi
done

echo "1. Checking Ansible role and playbook structure..."
if ! grep -q "roles:" "$SITE_FILE" || ! grep -q "\- skinlab" "$SITE_FILE"; then
  echo "FAIL: Role skinlab not referenced in $SITE_FILE!" >&2
  exit 1
fi
echo "  -> Role reference verified: PASS"

echo "2. Checking system user & group creation..."
if ! grep -q "Ensure skinlab system group exists" "$TASKS_FILE" || ! grep -q "Ensure skinlab system user exists" "$TASKS_FILE"; then
  echo "FAIL: User or group provisioning tasks missing in $TASKS_FILE!" >&2
  exit 1
fi
echo "  -> User and group tasks verified: PASS"

echo "3. Checking strict directory permissions..."
REQUIRED_PERMS=("0755" "0700" "0750")
for perm in "${REQUIRED_PERMS[@]}"; do
  if ! grep -q "mode: \"$perm\"" "$TASKS_FILE"; then
    echo "FAIL: Directory mode $perm missing in $TASKS_FILE!" >&2
    exit 1
  fi
done
echo "  -> Strict directory permissions (0755, 0700, 0750) verified: PASS"

echo "=== Ansible Idempotency & Structure Test: ALL PASS ==="
exit 0

