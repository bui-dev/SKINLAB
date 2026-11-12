# Clinic Device Certificate Authority (Device CA) Management

## 1. Security Overview
In accordance with ADR-0002 and ADR-0003, clinic workstations and remote administrators authenticate to Caddy
via mutual TLS (mTLS) using per-device x509 client certificates.

## 2. CA Architecture
- **Clinic Root CA:** Offline Root Authority stored in cold storage or secure hardware token.
- **Clinic Intermediate CA:** Active issuing CA for clinic doctor/receptionist workstations.
- **Remote Admin CA:** Dedicated intermediate CA for system administrator devices.

## 3. Directory Layout Outside Git
Certificates and private keys MUST NEVER be committed to Git. Store them on the deployment server:
```text
/opt/skinlab/secrets/
├── ca/
│   ├── clinic-device-ca.key (Mode 0400, owned by deployer)
│   ├── clinic-device-ca.pem
│   └── serial.txt
└── crl/
    └── clinic-device-ca.crl
```

## 4. Operational Scripts
- Issue device certificate: `docker/scripts/issue-device-certificate.sh`
- Revoke device certificate: `docker/scripts/revoke-device-certificate.sh`

