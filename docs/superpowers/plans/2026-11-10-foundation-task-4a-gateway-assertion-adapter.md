# Foundation Task 4A — Gateway Assertion Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supply a verifiable, one-time gateway assertion so Task 4 can create browser sessions only for an approved device and access context without delivering the full Task 8 staging platform.

**Architecture:** Caddy remains the mTLS ingress decision point. A minimal internal signer accepts only Caddy-authenticated device evidence and emits a short-lived HMAC assertion; Caddy copies that assertion upstream. The API verifies mTLS peer, assertion signature/request binding/replay, and registered-device state before creating or refreshing a session. A deterministic fake signer/issuer is used for local tests only.

**Tech Stack:** Caddy `forward_auth`, Node.js 22.23.3, NestJS/Fastify, PostgreSQL/Prisma, Next.js BFF, Vitest, Testcontainers.

**Spec:** `docs/adr/0002-identity-session-and-access-boundary.md`, `docs/superpowers/specs/2026-11-08-skinlab-system-architecture-design.md`, and `docs/superpowers/plans/2026-11-08-01-foundation-security-infrastructure.md` Task 4.

## Global Constraints

- Synthetic data and identities only; no production deployment or real credentials.
- Gateway assertion key is distinct from the BFF exchange key and unavailable to BFF code.
- Assertions are request-bound, expire in at most 60 seconds, and are consumed once.
- API denies missing, altered, expired, replayed, wrong-device, or wrong-context assertions.
- This plan excludes Task 8 monitoring, backup, WireGuard, Keycloak staging, and artifact promotion.

## Review Focus

- A BFF request with a valid BFF HMAC but no gateway assertion is denied.
- A gateway assertion copied to another method/path/body is denied.
- A revoked device is denied after a previously valid assertion.
- A callback whose ID-token nonce does not match the stored nonce hash creates no session.
- A logout/refresh request from a cross-origin browser request is denied before session state changes.

---

### Task 1: Persisted gateway-assertion verification

**Files:**
- Modify: `api-skinlab/prisma/schema.prisma`
- Create: `api-skinlab/prisma/migrations/<timestamp>_gateway_assertion_nonces/migration.sql`
- Create: `api-skinlab/src/modules/identity/infrastructure/gateway-assertion-repository.ts`
- Modify: `api-skinlab/src/modules/identity/infrastructure/gateway-assertion.ts`
- Test: `api-skinlab/src/modules/identity/infrastructure/gateway-assertion.integration.test.ts`

**Interfaces:** Produces `consumeGatewayAssertion(id: string, expiresAt: Date): Promise<boolean>` and `verifyGatewayAssertion(...)` with persistent replay protection.

- [ ] Write a Testcontainers test proving a valid assertion is accepted once and its replay is rejected across repository instances.
- [ ] Run the test and observe failure before repository/schema implementation.
- [ ] Implement the nonce table/repository and replace injected in-memory replay checks with the persistent adapter.
- [ ] Run the focused test, typecheck, and commit `feat(auth): persist gateway assertion replay protection`.

### Task 2: Minimal Caddy signer contract

**Files:**
- Create: `docker/gateway/Caddyfile.task4a`
- Create: `docker/gateway/context-signer/README.md`
- Create: `docker/gateway/context-signer/sign-assertion.mjs`
- Test: `docker/gateway/context-signer/sign-assertion.test.mjs`

**Interfaces:** Consumes Caddy-verified client-certificate fingerprint/context and produces only `X-SkinLab-Gateway-Assertion`; the signing key is read from a mounted secret file.

- [ ] Write a Node test proving signer rejects absent/invalid fingerprint or context and never returns key material.
- [ ] Run it red.
- [ ] Implement a local-only signer and Caddy `forward_auth` example that clears caller-supplied assertion headers and copies only signer output.
- [ ] Run the signer test and Compose/Caddy syntax validation; commit `feat(gateway): add task4 assertion signer contract`.

### Task 3: Session boundary and BFF completion

**Files:**
- Modify: `api-skinlab/src/modules/identity/http/session.controller.ts`
- Modify: `api-skinlab/src/modules/identity/identity.module.ts`
- Create: `api-skinlab/src/modules/identity/http/auth.guard.ts`
- Create: `api-skinlab/src/modules/identity/http/require-permission.decorator.ts`
- Create: `admin-skinlab/src/app/api/auth/{callback,logout,session}/route.ts`
- Modify: `admin-skinlab/src/features/auth/{types/session.ts,api/get-session.ts,hooks/use-session.ts,README.md}`
- Create: `admin-skinlab/src/proxy.ts`
- Remove: `admin-skinlab/src/features/auth/middleware.ts`
- Test: API HTTP/integration and frontend auth route tests.

**Interfaces:** API exposes BFF-only create/get/refresh/revoke session commands. BFF callback consumes the attempt, validates nonce hash and `acr=2`, then issues only an opaque session cookie.

- [ ] Add failing tests for missing/forged/replayed gateway assertion, callback nonce mismatch, cross-origin refresh/logout, and absence of browser-readable tokens.
- [ ] Implement the API commands/guard and BFF callback/logout/session/proxy adapters with fail-closed errors.
- [ ] Run Task 4 full auth gate and commit `feat(auth): complete BFF session boundary`.

### Task 4: Task 4 closure

**Files:**
- Modify: `docs/governance/FOUNDATION_EXECUTION_AUTHORIZATION.md`
- Modify: `docs/superpowers/plans/2026-11-08-skinlab-mvp-plan-index.md`
- Modify: `.github/workflows/ci.yml`
- Test: full root quality gate.

- [ ] Add API integration and focused auth tests to CI quality gate.
- [ ] Run lint, typecheck, unit, integration, BFF auth tests, secret scan, and build.
- [ ] Perform independent review, record evidence, commit closure documentation, and mark Task 4 complete only if every gate is green.
