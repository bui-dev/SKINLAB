# Runbook: Emergency Access Revocation

## 1. Scenario
A clinic workstation is reported lost, stolen, or compromised, or a staff member departs.

## 2. Immediate Revocation Actions
1. **Revoke Device Certificate:**
   ```bash
   ./docker/scripts/revoke-device-certificate.sh --serial <serial> --reason "Device compromised"
   ```
2. **Disable Account in Keycloak:**
   Mark user account `enabled = false` in Keycloak admin console or CLI.
3. **Terminate Active Sessions:**
   Revoke active sessions in PostgreSQL `user_sessions` table.
4. **Distribute Updated CRL:**
   Ensure Caddy picks up the refreshed `clinic-device-ca.crl`.

