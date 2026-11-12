# ADR-0003: Fake-data staging deployment, access gateway, monitoring, backup, and artifact promotion

**Status:** Accepted  
**Approval scope:** Provisional — fake-data local/staging only; not ratified for real patient data or production  
**Date:** 2026-11-12  
**Decision owner:** Product Owner / Engineering Coordinator  

## Context

SkinLab handles sensitive patient clinical information, photographs, appointment schedules, and payment receipts.
Before moving to pilot clinic operations, the platform requires an integrated staging environment that mirrors the
security architecture of production while remaining strictly bounded to synthetic/fake data.

Key requirements include:
1. Isolation from the public internet: only trusted gateway ingress and encrypted remote administrative tunnels may publish host ports.
2. Mutual TLS with device-level client certificates signed by internal clinic authorities for clinic personnel, and WireGuard VPN plus admin certificates for remote maintenance.
3. Continuous database write-ahead logging (WAL) and versioned object storage to meet strict disaster recovery objectives: RTO < 4 hours and RPO <= 15 minutes.
4. Immutable container deployment based strictly on SHA-256 image digests, preventing mutable tag hijacking.
5. Observable operation via metrics scraping and threshold alerting.

## Options Considered

1. Direct host port exposure with cloud-managed authentication and managed database backups. (Rejected: exposes sensitive database/storage ports to host networks and couples clinic topology to specific proprietary cloud vendors).
2. Single-container monolithic setup with local cron-based pg_dump. (Rejected: cannot achieve continuous WAL archiving or Point-In-Time Recovery with RPO <= 15 minutes; fails defense-in-depth isolation).
3. Containerized multi-service Docker Compose topology with Caddy trusted gateway, WireGuard remote VPN, Keycloak fake realm, continuous pgBackRest archiving, MinIO object versioning, and Prometheus observability, automated via idempotent Ansible playbooks.

## Decision

Adopt Option 3 for the staging environment under provisional fake-data scope.

### Network & Gateway Ingress
- The staging environment defines an isolated bridge network (`skinlab-internal`).
- Only two host ports are published:
  - TCP `443`: Caddy Ingress Gateway.
  - UDP `51820`: WireGuard VPN.
- Caddy acts as the sole browser-facing reverse proxy:
  - External listener requires client certificate authentication (`client_auth require_and_verify`).
  - Strips client-submitted context headers (`X-Device-Fingerprint`, `X-Access-Context`, `X-Gateway-Assertion`).
  - Differentiates clinic context vs WireGuard remote context based on client subnet (`10.13.13.0/24`).
  - Proxies through internal context signer to issue short-lived HMAC-signed gateway assertions.
  - Forwards traffic to the Next.js BFF and NestJS API via authenticated internal mTLS channels.

### Access Context & Remote Administration
- Clinic context (`clinic`): Available to doctors and receptionists only via clinic workstations presenting valid clinic device certificates.
- Remote context (`remote`): Strictly denied to doctors and receptionists. Permitted exclusively to system administrators connecting through WireGuard VPN and presenting valid admin device certificates.

### Disaster Recovery & Business Continuity
- PostgreSQL 17 configured with `archive_mode = on` and `archive_command` invoking pgBackRest.
- pgBackRest stores backups on an independent host volume outside the VM container data volume.
- MinIO object storage enables versioning on clinical media buckets.
- Recovery targets: RTO < 4 hours, RPO <= 15 minutes, verifiable via automated restore drills.

### Artifact Promotion & Observability
- Container deployment strictly requires SHA-256 image digests (`ref@sha256:...`). Mutable tags (e.g. `:latest`) are prohibited in staging Compose configs.
- Prometheus scrapes metrics from internal exporters (node-exporter, cadvisor, postgres-exporter, API, Web).
- Alertmanager routes critical alerts for downtime, disk pressure, and backup freshness violations.

## Consequences

- Positive: Reproducible, hardened staging environment matching clinic security model without real data risks.
- Positive: Verifiable disaster recovery mechanisms with measurable RTO and RPO metrics.
- Negative: Operational overhead of maintaining internal device certificates and WireGuard peers.
- Limitation: Single-host staging VM topology is provisional and not ratified for multi-tenant production.

