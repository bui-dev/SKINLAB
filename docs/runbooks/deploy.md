# Runbook: Staging Deployment & Rollback

## 1. Overview
This runbook defines the operational procedure for deploying SkinLab to the Staging environment
using immutable SHA-256 image digests.

## 2. Prerequisites
- Verified container images pushed to registry with immutable digest.
- External secrets present under `/opt/skinlab/secrets/`.
- Access to staging host via SSH.

## 3. Deployment Procedure
```bash
./docker/scripts/deploy-staging.sh \
  --inventory docker/iac/ansible/inventory.example.yml \
  --web-image skinlab/admin-web@sha256:<digest> \
  --api-image skinlab/api@sha256:<digest>
```

## 4. Post-Deployment Verification
- Run health check: `curl -k https://localhost:443/health`
- Verify Prometheus targets: `curl http://localhost:9090/api/v1/targets`

## 5. Rollback Procedure
In case of failure, re-run `deploy-staging.sh` with the previous known good image digests.

