# SkinLab Foundation, Security, and Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a deployable pnpm monorepo with a secure web/API foundation, PostgreSQL persistence, OIDC/MFA authorization, private object storage, audit logging, scheduled jobs, monitoring, and tested recovery.

**Architecture:** The existing Next.js foundation becomes `admin-skinlab`; a NestJS modular-monolith backend lives in `api-skinlab`. PostgreSQL is the transactional system of record, private S3-compatible storage holds files, and all infrastructure is reached through adapters owned by backend modules.

**Tech Stack:** Node.js 22.23.3, pnpm 12.18.0, Next.js 16.4.5, React 19.3.1, NestJS 12.4.0 with Fastify, PostgreSQL 17, Prisma 7.10.1, Zod 4.6.7, openid-client 6.8.9, AWS SDK S3 client 3.1164.0, Vitest 5.1.0, Testcontainers 12.2.1, Playwright 1.65.0.

**Specs:** `docs/superpowers/specs/2026-11-08-skinlab-system-architecture-design.md` and `docs/superpowers/specs/2026-11-08-skinlab-project-governance-design.md`

**Execution status:** Execution-detail approved. Task 1 completed; the Product Owner authorized Task 2 on 2026-11-09 for fake-data local/staging only. Tasks 3–9 remain unauthorized until their dependency/authorization checks. Identity/access and staging/deployment ADRs remain provisional and do not authorize real data or production.

## Global Constraints

- One clinic, two doctors, one receptionist/stock keeper, and one remote-capable admin.
- Individual accounts and two-factor authentication are mandatory.
- Doctors and reception require both the clinic-approved access path and a registered managed device; admin may connect remotely from an approved device.
- Backend modules own their tables and invariants; no module writes another module's tables directly.
- Clinical files and payment evidence are private; no public object URLs.
- RTO is 4 hours and RPO is 15 minutes.
- The system is online-only; outage fallback remains controlled paper entry.
- Follow ADR-0001: verify a clean frontend working state and record the old remote/commit before removing nested Git metadata. The active monorepo starts with fresh root history.
- Use fake data only. The Ubuntu VM is staging, not an approved production platform.

## Review Focus

- A valid user token from an unapproved access context must be denied by both gateway policy and backend authorization tests.
- Replayed or expired bearer tokens must never create an authenticated session.
- Retrying a failed write must not create duplicate audit events or duplicate domain writes.
- An object key or guessed URL must not reveal a private clinical/payment file.
- Restore evidence must demonstrate both database point-in-time recovery and object-version recovery within the approved RTO/RPO.

---

### Task 1: Initialize the fresh root pnpm monorepo

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `pnpm-lock.yaml`
- Create: `.npmrc`
- Create: `.gitignore`
- Create: `.gitleaks.toml`
- Create: `tools/workspace/verify-root-workspace.mjs`
- Test: `tools/workspace/verify-root-workspace.test.sh`
- Create: `tools/security/scan-secrets.sh`
- Test: `tools/security/scan-secrets.test.sh`
- Modify: `admin-skinlab/package.json` (`name=@skinlab/admin-web`; root owns `packageManager` and Husky preparation)
- Remove after root lock generation: `admin-skinlab/pnpm-workspace.yaml`
- Remove after root lock generation: `admin-skinlab/pnpm-lock.yaml`
- Remove from filesystem: `admin-skinlab/.git` after the migration precondition check; this metadata is not part of the root commit
- Create: `packages/tsconfig/base.json`
- Create: `packages/tsconfig/package.json`
- Create: `packages/eslint-config/package.json`
- Create: `packages/eslint-config/index.mjs`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/test-support/package.json`
- Create: `packages/test-support/src/index.ts`
- Create: `.github/workflows/ci.yml`
- Create: `docs/reviews/foundation-repository-migration.md`
- Test: `packages/contracts/src/index.test.ts`

**Interfaces:**

- Consumes: Existing `admin-skinlab` source, `package.json`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml` dependency policies.
- Produces: Workspace packages `@skinlab/admin-web`, `@skinlab/contracts`, `@skinlab/test-support`; root scripts `workspace:verify`, `security:secrets`, `lint`, `typecheck`, `test`, and `build`; CI required checks named `quality` and `secret-scan`. `verify-root-workspace.mjs` exits nonzero unless the approved globs and migrated pnpm policies exist, nested workspace/lock files are absent, and every `packages/*` directory has a manifest.

- [x] **Step 1: Verify the fresh-history migration preconditions**

Run `git -C admin-skinlab status --short --branch`, record the old remote URL and current commit in `docs/reviews/foundation-repository-migration.md`, and confirm there is no uncommitted work. Stop if the check is not clean.

- [x] **Step 2: Write failing workspace and contract smoke tests**

Create `tools/workspace/verify-root-workspace.test.sh` for the root policy and `packages/contracts/src/index.test.ts` importing `ContractVersion` from `@skinlab/contracts` and asserting it equals `1`.

- [x] **Step 3: Run the smoke test before workspace wiring**

Run: `bash tools/workspace/verify-root-workspace.test.sh && pnpm --filter @skinlab/contracts test`

Expected: FAIL because the root workspace verifier, package, and script do not exist.

- [x] **Step 4: Create the fresh root repository and workspace manifests**

Remove only the verified `admin-skinlab/.git`, run `git init -b main` at `SKINLAB/`, and verify `git branch --show-current` returns `main` before the first commit. Define `admin-skinlab`, `api-skinlab`, and `packages/*` in the root `pnpm-workspace.yaml`. Copy the existing `minimumReleaseAgeExclude` and `allowBuilds` mappings exactly from `admin-skinlab/pnpm-workspace.yaml` into the root workspace file. Pin `packageManager` to `pnpm@12.18.0` in root `package.json`, rename the frontend package to `@skinlab/admin-web`, and leave its application source, test, lint, typecheck, build, and Storybook scripts unchanged.

- [x] **Step 5: Generate the root lockfile and retire nested workspace metadata**

Run `pnpm install --lockfile-only` from `SKINLAB/`, confirm the generated root `pnpm-lock.yaml` includes the `admin-skinlab` importer and retains the approved native build dependencies, then remove only `admin-skinlab/pnpm-workspace.yaml` and `admin-skinlab/pnpm-lock.yaml`. Run `pnpm install --frozen-lockfile` and `pnpm --filter @skinlab/admin-web test` to prove the frontend still resolves under the root policy.

- [x] **Step 6: Implement the shared packages and make the smoke test pass**

Export `const ContractVersion = 1 as const` from `packages/contracts/src/index.ts`; give each shared package explicit `typecheck`, `test`, and `build` scripts; extend `packages/tsconfig/base.json` from the root-compatible strict TypeScript settings. Implement `verify-root-workspace.mjs`, expose it as `pnpm workspace:verify`, and run `bash tools/workspace/verify-root-workspace.test.sh && pnpm workspace:verify && pnpm --filter @skinlab/contracts test`; expect PASS.

- [x] **Step 7: Add and prove secret scanning**

First write and run `scan-secrets.test.sh`; expect FAIL because the scanner is absent. Then add a pinned Gitleaks invocation through `tools/security/scan-secrets.sh [path="."]` and expose it as `pnpm security:secrets`. The test must demonstrate that the scanner fails on a temporary synthetic credential fixture, remove the fixture, and then demonstrate a clean scan of the working tree and Git history. Record both results without committing the synthetic credential.

- [x] **Step 8: Add the root CI workflow**

Configure `.github/workflows/ci.yml` with stable job names `quality` and `secret-scan`, Node 22.23.3, Corepack/pnpm 12.18.0, `pnpm install --frozen-lockfile`, workspace verification, the secret scan, then the root lint/typecheck/test/build scripts. Do not add deployment credentials or a staging deployment job.

- [x] **Step 9: Install and run the full workspace gate**

Run: `pnpm install && pnpm security:secrets && pnpm -r lint && pnpm -r typecheck && pnpm -r test && pnpm -r build`

Expected: all workspace packages complete with exit code 0.

- [x] **Step 10: Commit the root workspace**

```bash
git add .gitignore .gitleaks.toml package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc admin-skinlab packages tools docs .github
git commit -m "build: establish skinlab pnpm monorepo"
```

- [x] **Step 11: Create the new remote and protected promotion branches**

After the owner creates or selects the new empty monorepo remote, add it as `origin`; do not reuse the old frontend remote. Push the root commit and wait for `quality` and `secret-scan` to pass. Create `dev` and `stg` from the same baseline, and configure `dev`, `stg`, and `main` to reject force-push/deletion and require pull requests plus those two named checks. Leave the working checkout on `dev`. Verify the rules through the provider's read-only branch/rules view and record the remote URL and rule evidence in `docs/reviews/foundation-repository-migration.md`.

### Task 2: Add the NestJS API composition root and validated configuration

**Files:**

- Create: `api-skinlab/package.json`
- Create: `api-skinlab/tsconfig.json`
- Create: `api-skinlab/src/main.ts`
- Create: `api-skinlab/src/app.module.ts`
- Create: `api-skinlab/src/config/env.ts`
- Create: `api-skinlab/src/config/internal-tls.ts`
- Create: `api-skinlab/src/health/health.controller.ts`
- Create: `api-skinlab/src/health/health.module.ts`
- Create: `api-skinlab/src/health/health.controller.test.ts`
- Create: `api-skinlab/.env.example`
- Modify: `admin-skinlab/src/config/env.ts`
- Modify: `admin-skinlab/.env.example`
- Modify: `admin-skinlab/src/test/env.test.ts`

**Interfaces:**

- Consumes: Root workspace scripts from Task 1.
- Produces: `GET /health/live -> { status: "ok" }`; `GET /health/ready -> { status: "ready" | "not_ready", checks: Record<string, boolean> }`; `loadEnv(input: NodeJS.ProcessEnv): ApiEnv`; `loadWebServerEnv(input: NodeJS.ProcessEnv): WebServerEnv`; `createInternalTlsOptions(env: ApiEnv): FastifyHttpsOptions`. `ApiEnv` includes database/S3/timezone plus `OIDC_ISSUER`, `OIDC_AUDIENCE`, `OIDC_REQUIRED_ACR=2`, `TOKEN_ENCRYPTION_KEY`, `BFF_EXCHANGE_HMAC_KEY`, `INTERNAL_TLS_CERT_PATH`, `INTERNAL_TLS_KEY_PATH`, `INTERNAL_TLS_CLIENT_CA_PATH`, and `GATEWAY_CLIENT_CERT_FINGERPRINT`. `WebServerEnv` includes `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`, `OIDC_REQUIRED_ACR=2`, `API_INTERNAL_BASE_URL`, `BFF_EXCHANGE_HMAC_KEY`, `SESSION_COOKIE_NAME`, and `LOGIN_ATTEMPT_COOKIE_NAME`; none is exposed through `NEXT_PUBLIC_*`.

- [x] **Step 1: Write failing health and environment tests**

Test names: `returns_liveness_without_external_dependencies`, `rejects_missing_database_url`, `rejects_missing_auth_encryption_or_internal_tls_configuration`, `rejects_missing_web_oidc_callback_configuration`, and `does_not_expose_server_secrets`.

- [x] **Step 2: Run the API tests**

Run: `pnpm --filter @skinlab/api test -- health.controller.test.ts && pnpm --filter @skinlab/admin-web test -- src/test/env.test.ts`

Expected: FAIL because the API package and controllers do not exist.

- [x] **Step 3: Implement the minimal Fastify-based Nest application**

Use Zod for the complete `ApiEnv` and `WebServerEnv` contracts above. Require encryption/HMAC keys of the documented byte length, HTTPS redirect URI outside tests, absolute secret-file paths, and `CLINIC_TIMEZONE=Asia/Ho_Chi_Minh`. `createInternalTlsOptions` loads the API certificate/key and requires the configured Caddy client CA; no browser-facing code may import either server-env loader.

- [x] **Step 4: Run API tests and typecheck**

Run: `pnpm --filter @skinlab/api test && pnpm --filter @skinlab/api typecheck && pnpm --filter @skinlab/admin-web test -- src/test/env.test.ts && pnpm --filter @skinlab/admin-web typecheck`

Expected: PASS with no TypeScript errors.

- [x] **Step 5: Commit**

```bash
git add api-skinlab admin-skinlab/src/config/env.ts admin-skinlab/.env.example admin-skinlab/src/test/env.test.ts
git commit -m "feat(api): add health and validated configuration"
```

### Task 3: Add PostgreSQL, Prisma, and module-owned transaction support

**Files:**

- Create: `api-skinlab/prisma/schema.prisma`
- Create: `api-skinlab/prisma/migrations/**`
- Create: `api-skinlab/src/platform/database/database.module.ts`
- Create: `api-skinlab/src/platform/database/prisma.service.ts`
- Create: `api-skinlab/src/platform/database/transaction-manager.ts`
- Create: `api-skinlab/src/platform/database/transaction-manager.integration.test.ts`
- Create: `docker/local/compose.yaml`

**Interfaces:**

- Consumes: `ApiEnv.DATABASE_URL` from Task 2.
- Produces: `TransactionManager.run<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>` and injectable `PrismaService` limited to infrastructure adapters.

- [ ] **Step 1: Write a failing rollback integration test**

Create `transaction-manager.integration.test.ts` that inserts a fixture audit row inside `TransactionManager.run`, throws, and asserts no row remains.

- [ ] **Step 2: Run the integration test with PostgreSQL Testcontainer**

Run: `pnpm --filter @skinlab/api test:integration -- transaction-manager.integration.test.ts`

Expected: FAIL because schema and transaction manager do not exist.

- [ ] **Step 3: Implement Prisma configuration and transaction adapter**

Start with platform tables for `AuditEvent`, `IdempotencyKey`, and `RegisteredDevice`; application modules add their own models in later plans.

- [ ] **Step 4: Generate, migrate, and rerun the integration test**

Run: `pnpm --filter @skinlab/api prisma:generate && pnpm --filter @skinlab/api prisma:migrate:test && pnpm --filter @skinlab/api test:integration`

Expected: PASS and rollback leaves zero rows.

- [ ] **Step 5: Commit**

```bash
git add api-skinlab/prisma api-skinlab/src/platform/database docker/local
git commit -m "feat(api): add postgres transaction foundation"
```

### Task 4: Implement OIDC authentication, MFA evidence, roles, and access context

**Files:**

- Create: `docs/adr/0002-identity-session-and-access-boundary.md`
- Modify: `docs/adr/README.md`
- Create: `packages/contracts/src/auth.ts`
- Modify: `api-skinlab/prisma/schema.prisma`
- Create: `api-skinlab/prisma/migrations/<timestamp>_identity_sessions/migration.sql`
- Create: `api-skinlab/src/modules/identity/domain/authenticated-user.ts`
- Create: `api-skinlab/src/modules/identity/domain/user-session.ts`
- Create: `api-skinlab/src/modules/identity/domain/oidc-login-attempt.ts`
- Create: `api-skinlab/src/modules/identity/application/authorize-request.ts`
- Create: `api-skinlab/src/modules/identity/application/create-login-attempt.ts`
- Create: `api-skinlab/src/modules/identity/application/consume-login-attempt.ts`
- Create: `api-skinlab/src/modules/identity/application/create-session-from-oidc.ts`
- Create: `api-skinlab/src/modules/identity/application/get-session.ts`
- Create: `api-skinlab/src/modules/identity/application/refresh-session.ts`
- Create: `api-skinlab/src/modules/identity/application/revoke-session.ts`
- Create: `api-skinlab/src/modules/identity/infrastructure/oidc-token-verifier.ts`
- Create: `api-skinlab/src/modules/identity/infrastructure/mtls-gateway-context-verifier.ts`
- Create: `api-skinlab/src/modules/identity/infrastructure/prisma-session-repository.ts`
- Create: `api-skinlab/src/modules/identity/infrastructure/prisma-login-attempt-repository.ts`
- Create: `api-skinlab/src/modules/identity/http/auth.guard.ts`
- Create: `api-skinlab/src/modules/identity/http/session.controller.ts`
- Create: `api-skinlab/src/modules/identity/http/require-permission.decorator.ts`
- Create: `api-skinlab/src/modules/identity/identity.module.ts`
- Create: `api-skinlab/src/modules/identity/application/authorize-request.test.ts`
- Create: `api-skinlab/src/modules/identity/application/session-lifecycle.integration.test.ts`
- Create: `api-skinlab/src/modules/identity/application/login-attempt.integration.test.ts`
- Create: `api-skinlab/src/modules/identity/infrastructure/oidc-token-verifier.integration.test.ts`
- Create: `api-skinlab/src/modules/identity/infrastructure/mtls-gateway-context-verifier.test.ts`
- Modify: `admin-skinlab/src/features/auth/types/session.ts`
- Modify: `admin-skinlab/src/features/auth/api/get-session.ts`
- Modify: `admin-skinlab/src/features/auth/hooks/use-session.ts`
- Modify: `admin-skinlab/src/features/auth/README.md`
- Remove: `admin-skinlab/src/features/auth/middleware.ts`
- Create: `admin-skinlab/src/features/auth/server/oidc-bff-client.ts`
- Create: `admin-skinlab/src/features/auth/server/session-cookie.ts`
- Create: `admin-skinlab/src/features/auth/server/api-session-client.ts`
- Create: `admin-skinlab/src/app/api/auth/login/route.ts`
- Create: `admin-skinlab/src/app/api/auth/callback/route.ts`
- Create: `admin-skinlab/src/app/api/auth/logout/route.ts`
- Create: `admin-skinlab/src/app/api/auth/session/route.ts`
- Create: `admin-skinlab/src/features/auth/server/oidc-bff-client.test.ts`
- Create: `admin-skinlab/src/features/auth/server/session-cookie.test.ts`
- Create: `admin-skinlab/src/proxy.ts`

**Interfaces:**

- Consumes: Task 2 auth/encryption/internal-TLS configuration, `RegisteredDevice`, database transactions, and a Caddy client certificate trusted by the API mTLS listener.
- Produces: internal-only `createLoginAttempt(input: { state: string; nonce: string; codeVerifier: string; expiresAt: Instant }): Promise<{ attemptId: string }>`; one-time `consumeLoginAttempt(attemptId: string, returnedState: string): Promise<ConsumedLoginAttempt>`; `verifyAccessToken(token: string): Promise<VerifiedIdentity>`; `verifyGatewayContext(socket: TLSSocket, headers: GatewayHeaders): Promise<AccessContext>`; `authorizeRequest(identity: VerifiedIdentity, context: AccessContext, permission: Permission): AuthenticatedUser`; `createSessionFromOidc(input: CreateOidcSessionInput): Promise<UserSession>`; `getSession(sessionId: string): Promise<UserSession | null>`; `refreshSession(sessionId: string): Promise<UserSession>`; `revokeSession(sessionId: string, reason: string): Promise<void>`; web `issueLoginAttemptCookie(attemptId: string): Promise<string>`, `readLoginAttemptCookie(): Promise<string | null>`, `clearLoginAttemptCookie(): Promise<string>`, `issueSessionCookie(sessionId: string): Promise<string>`, `readSessionCookie(): Promise<string | null>`, and `clearSessionCookie(): Promise<string>`. Raw state/nonce/verifier traverse only the HMAC-authenticated internal BFF channel; the API hashes state/nonce and encrypts the verifier with `TOKEN_ENCRYPTION_KEY` before persistence. Browser cookies contain opaque IDs only; access/refresh tokens and rotation history remain server-side. Authorization requires `acr >= OIDC_REQUIRED_ACR`, role, registered device certificate fingerprint, and allowed clinic/remote context.

- [ ] **Step 1: Record and provisionally approve the identity/access ADR**

Compare the OIDC provider boundary, browser session/BFF behavior, token refresh, gateway trust headers, managed-device evidence, and failure/revocation behavior. Set ADR status to `Accepted` and approval scope to `Provisional — fake-data local/staging only; not ratified for real data/production`. Obtain independent AI security review, record Engineering Coordinator approval, and add the ADR with its scope to `docs/adr/README.md` before implementation.

- [ ] **Step 2: Write and run failing authorization matrix tests**

Cover doctor at clinic on a registered device, receptionist outside clinic, remote admin with `acr=2`, `acr<2`, disabled user, forged context headers without the configured Caddy mTLS peer, unregistered device-certificate fingerprint, and expired token. Run `pnpm --filter @skinlab/api test -- authorize-request.test.ts mtls-gateway-context-verifier.test.ts`; expect FAIL.

- [ ] **Step 3: Implement domain authorization and make its tests pass**

Require issuer, audience, expiry, subject, role claims, `acr >= OIDC_REQUIRED_ACR`, registered-device state, and access context. Trust Caddy-supplied device/network headers only when the API TLS socket presents the configured Caddy client certificate chained to `INTERNAL_TLS_CLIENT_CA_PATH`; source range alone never authenticates a device or user. Rerun both focused tests; expect PASS.

- [ ] **Step 4: Write and run failing login-attempt and session lifecycle integration tests**

Cover one-time state/nonce/PKCE attempt creation and consumption, wrong state, expiry, second consumption, OIDC login creation through the HMAC-authenticated BFF exchange, rejection of a direct/replayed bearer as a new browser session, opaque session lookup, refresh-token rotation, reuse of an already-rotated refresh token, disabled-user/global revocation, logout, expired session, and retry safety. Run `pnpm --filter @skinlab/api test:integration -- login-attempt.integration.test.ts session-lifecycle.integration.test.ts`; expect FAIL.

- [ ] **Step 5: Implement server-side session persistence and lifecycle**

Add login-attempt/session schema and repositories, application services, and BFF-only controller endpoints authenticated with `BFF_EXCHANGE_HMAC_KEY`. Hash state/nonce/session IDs, encrypt PKCE verifiers and refresh tokens with `TOKEN_ENCRYPTION_KEY`, bind access context/device evidence, consume login attempts once, and make consume/refresh/revoke transactional. Rerun both integration tests; expect PASS.

- [ ] **Step 6: Write and run failing deterministic token-verifier tests**

Use a test issuer/JWKS to cover valid signature with `acr=2`, wrong issuer/audience, expired token, unknown key, JWKS key rotation, and missing/insufficient `acr`. Run `pnpm --filter @skinlab/api test:integration -- oidc-token-verifier.integration.test.ts`; expect FAIL.

- [ ] **Step 7: Implement OIDC verification and make verifier tests pass**

Cache JWKS within bounded TTL, validate the full token contract, and return typed failures without token contents in logs. Rerun the verifier integration test; expect PASS.

- [ ] **Step 8: Write and run failing BFF route/cookie tests**

Cover API-backed state/nonce/PKCE attempt creation and one-time consumption, a five-minute `HttpOnly; Secure; SameSite=Lax` login-attempt cookie required for the cross-site OIDC callback, a `HttpOnly; Secure; SameSite=Strict` opaque-session cookie after callback, essential `acr=2` request and callback verification, session refresh through the API, logout clearing both cookies, and client code never receiving a bearer/refresh token. Run `pnpm --filter @skinlab/admin-web test -- features/auth`; expect FAIL.

- [ ] **Step 9: Implement the web BFF routes and opaque-cookie adapter**

Implement login/callback/logout/session routes, server-only API session client, API-backed creation/consumption of the opaque login attempt, essential `acr=2` request/callback verification, updated `getSession`/`useSession`, and route protection in `src/proxy.ts`. Authenticate BFF-to-API login/session exchange requests with `BFF_EXCHANGE_HMAC_KEY`; never put state, nonce, PKCE verifier, client secret, or tokens in browser-readable storage. Rerun the focused web auth tests; expect PASS.

- [ ] **Step 10: Run the complete auth gate**

Run: `pnpm --filter @skinlab/api test -- modules/identity && pnpm --filter @skinlab/api test:integration -- modules/identity && pnpm --filter @skinlab/admin-web test -- features/auth && pnpm -r typecheck`

Expected: all authorization, session, token, BFF, and type checks pass.

- [ ] **Step 11: Commit**

```bash
git add docs/adr/README.md docs/adr/0002-identity-session-and-access-boundary.md packages/contracts/src/auth.ts api-skinlab/prisma api-skinlab/src/modules/identity admin-skinlab/src/features/auth admin-skinlab/src/app/api/auth admin-skinlab/src/proxy.ts
git commit -m "feat(auth): enforce oidc mfa roles and access context"
```

### Task 5: Add immutable audit recording and safe idempotency

**Files:**

- Create: `api-skinlab/src/modules/audit/domain/audit-event.ts`
- Create: `api-skinlab/src/modules/audit/application/record-audit-event.ts`
- Create: `api-skinlab/src/modules/audit/infrastructure/prisma-audit-repository.ts`
- Create: `api-skinlab/src/modules/audit/application/execute-idempotently.ts`
- Create: `api-skinlab/src/modules/audit/audit.module.ts`
- Create: `api-skinlab/src/modules/audit/application/execute-idempotently.integration.test.ts`

**Interfaces:**

- Consumes: `TransactionManager` from Task 3 and `AuthenticatedUser` from Task 4.
- Produces: `recordAuditEvent(event: AuditEventInput, tx?: TransactionContext): Promise<void>`; `executeIdempotently<T>(scope: string, key: string, work: () => Promise<T>): Promise<T>`.

- [ ] **Step 1: Write failing idempotency and immutability tests**

Assert the same key returns the first result without a second domain write, and no repository method exposes update/delete for `AuditEvent`.

- [ ] **Step 2: Run the audit integration tests**

Run: `pnpm --filter @skinlab/api test:integration -- modules/audit`

Expected: FAIL because the audit module does not exist.

- [ ] **Step 3: Implement append-only audit and idempotent execution**

Store actor, subject, action, entity type/id, timestamp, request correlation, access context, and before/after references without placing secrets or full clinical images in logs.

- [ ] **Step 4: Rerun tests**

Run: `pnpm --filter @skinlab/api test:integration -- modules/audit`

Expected: PASS with one domain write and one audit event on retry.

- [ ] **Step 5: Commit**

```bash
git add api-skinlab/src/modules/audit
git commit -m "feat(audit): add immutable events and idempotent writes"
```

### Task 6: Add private object storage and scoped file access

**Files:**

- Create: `api-skinlab/src/modules/media/domain/stored-object.ts`
- Create: `api-skinlab/src/modules/media/application/store-private-object.ts`
- Create: `api-skinlab/src/modules/media/application/create-read-grant.ts`
- Create: `api-skinlab/src/modules/media/infrastructure/s3-object-store.ts`
- Create: `api-skinlab/src/modules/media/media.module.ts`
- Create: `api-skinlab/src/modules/media/application/media-access.integration.test.ts`
- Modify: `docker/local/compose.yaml`

**Interfaces:**

- Consumes: `AuthenticatedUser`, audit recorder, S3 configuration.
- Produces: `storePrivateObject(input: StoreObjectInput): Promise<StoredObjectRef>`; `createReadGrant(objectId: ObjectId, actor: AuthenticatedUser, ttlSeconds: number): Promise<ShortLivedReadUrl>`.

- [ ] **Step 1: Write failing authorization and URL-expiry tests**

Cover a permitted doctor, forbidden receptionist, guessed key, expired URL, invalid MIME type, oversized file, and retry with the same idempotency key.

- [ ] **Step 2: Run media tests against a MinIO Testcontainer**

Run: `pnpm --filter @skinlab/api test:integration -- modules/media`

Expected: FAIL because the media adapter is absent.

- [ ] **Step 3: Implement private storage**

Keep buckets private, generate random opaque keys, record SHA-256 checksum and metadata, create short-lived signed reads only after domain authorization, and audit store/read actions.

- [ ] **Step 4: Rerun tests**

Run: `pnpm --filter @skinlab/api test:integration -- modules/media`

Expected: PASS; direct anonymous object access remains denied.

- [ ] **Step 5: Commit**

```bash
git add api-skinlab/src/modules/media docker/local/compose.yaml
git commit -m "feat(media): add private audited object storage"
```

### Task 7: Add idempotent scheduled-job infrastructure in clinic timezone

**Files:**

- Create: `api-skinlab/src/platform/jobs/job-run.entity.ts`
- Create: `api-skinlab/src/platform/jobs/run-scheduled-job.ts`
- Create: `api-skinlab/src/platform/jobs/jobs.module.ts`
- Create: `api-skinlab/src/platform/jobs/run-scheduled-job.integration.test.ts`
- Modify: `api-skinlab/prisma/schema.prisma`
- Create: `api-skinlab/prisma/migrations/**`

**Interfaces:**

- Consumes: `TransactionManager`, `executeIdempotently`, `CLINIC_TIMEZONE`.
- Produces: `runScheduledJob(jobName: string, scheduledFor: Date, work: () => Promise<JobResult>): Promise<JobRun>`.

- [ ] **Step 1: Write a failing duplicate-run test**

Run the same `jobName + scheduledFor` concurrently and assert exactly one work callback and one successful `JobRun`.

- [ ] **Step 2: Run the job integration test**

Run: `pnpm --filter @skinlab/api test:integration -- platform/jobs`

Expected: FAIL because job locking does not exist.

- [ ] **Step 3: Implement database-backed job leases and history**

Use a unique key on `jobName + scheduledFor`; record start, finish, outcome, and error summary. Jobs must be safe when retried after process failure.

- [ ] **Step 4: Run DST/timezone and concurrency tests**

Run: `TZ=UTC pnpm --filter @skinlab/api test:integration -- platform/jobs`

Expected: PASS while clinic-local schedules still resolve to `Asia/Ho_Chi_Minh`.

- [ ] **Step 5: Commit**

```bash
git add api-skinlab/src/platform/jobs api-skinlab/prisma
git commit -m "feat(platform): add idempotent scheduled jobs"
```

### Task 8: Define deployment, access gateway, monitoring, backup, and restore

**Files:**

- Create: `docs/adr/0003-fake-data-staging-and-artifact-promotion.md`
- Modify: `docs/adr/README.md`
- Create: `docker/staging/compose.yaml`
- Create: `docker/staging/compose.env.example`
- Create: `docker/staging/Caddyfile`
- Create: `docker/staging/keycloak/realm-skinlab-fake.json`
- Create: `docker/staging/wireguard/wg0.conf.example`
- Create: `docker/staging/gateway/device-ca/README.md`
- Create: `docker/staging/postgres/postgresql.conf`
- Create: `docker/staging/pgbackrest/pgbackrest.conf`
- Create: `docker/staging/prometheus.yml`
- Create: `docker/staging/alert-rules.yml`
- Create: `docker/staging/alertmanager.yml`
- Create: `docker/iac/ansible/inventory.example.yml`
- Create: `docker/iac/ansible/site.yml`
- Create: `docker/iac/ansible/group_vars/staging.example.yml`
- Create: `docker/iac/ansible/roles/skinlab/tasks/main.yml`
- Create: `docker/scripts/deploy-staging.sh`
- Create: `docker/scripts/issue-device-certificate.sh`
- Create: `docker/scripts/revoke-device-certificate.sh`
- Create: `docs/runbooks/deploy.md`
- Create: `docs/runbooks/restore.md`
- Create: `docs/runbooks/access-revocation.md`
- Create: `docker/scripts/verify-backup.sh`
- Create: `docker/scripts/restore-drill.sh`
- Create: `docs/operations/slo.md`
- Test: `docker/tests/staging-compose.test.sh`
- Test: `docker/tests/access-boundary.test.sh`
- Test: `docker/tests/monitoring-config.test.sh`
- Test: `docker/tests/ansible-idempotency.test.sh`
- Test: `docker/tests/restore-drill.test.sh`

**Interfaces:**

- Consumes: Digest-pinned web/API images, API/web health endpoints, PostgreSQL WAL/base backups, object versions, Task 2 internal-TLS paths, Task 4 OIDC/registered-device contracts, and owner-supplied Ansible inventory/CA/private keys/secrets outside Git.
- Produces: `deploy-staging.sh --inventory <file> --web-image <ref@sha256:digest> --api-image <ref@sha256:digest>`; `issue-device-certificate.sh --device-id <id> --role <doctor|reception|admin>`; `revoke-device-certificate.sh --serial <serial> --reason <text>`; `verify-backup.sh --environment <name> --max-age-minutes <n>`; `restore-drill.sh --environment <name> --target-time <ISO-8601>`; repeatable fake-data staging deployment, WireGuard remote-admin tunnel, per-device mTLS, Caddy-to-API mTLS, access policy, alert rules, and machine-readable evidence under ignored `artifacts/operations/`.

- [ ] **Step 1: Record and provisionally approve the staging/release ADR**

Provisionally select Docker Compose, Ansible provisioning, WireGuard for remote-admin network entry, Caddy with per-device client certificates as the only browser ingress, Caddy-to-API mTLS, a fake-user-only Keycloak OIDC container, Prometheus/Alertmanager with node/container/PostgreSQL exporters, pgBackRest continuous archiving, and versioned private object storage. Document secret injection, CA/private-key custody outside Git, rotated logs, backup location, digest-only artifact promotion, the host-mounted/off-VM limitation of the zero-cost backup target, and the explicit non-production classification of the Ubuntu VM. Set ADR status to `Accepted` and approval scope to `Provisional — fake-data local/staging only; not ratified for real data/production`. Obtain independent AI DevOps/security review, record Engineering Coordinator approval, and index the ADR.

- [ ] **Step 2: Write and run the failing Compose policy test**

Test that only Caddy and WireGuard publish host ports; web/API/PostgreSQL/object storage/exporters use internal networks; all images are digest-pinned; secrets/CA material use mounted files; Keycloak realm requires LoA 2/TOTP and emits role plus `acr=2`; buckets enable versioning; PostgreSQL loads the pgBackRest archive command; health checks/resource limits/rotated logs exist; and no real-data/production label is present. Run `bash docker/tests/staging-compose.test.sh`; expect FAIL.

- [ ] **Step 3: Implement the fake-data staging Compose configuration**

Define digest-pinned `wireguard`, `gateway`, `admin-web`, `api`, `postgres`, `pgbackrest`, `minio`, `minio-init`, `keycloak`, `node-exporter`, `cadvisor`, `postgres-exporter`, `prometheus`, and `alertmanager` services and their internal networks in `docker/staging/compose.yaml`. Add Caddy ingress, WireGuard example without private keys, PostgreSQL/pgBackRest configs, and a fake Keycloak realm with doctor/reception/admin roles, mandatory TOTP enrollment, LoA-2 browser flow, essential/default `acr=2`, and fake users only. Keep all credentials, CA keys, TOTP seeds, and real user data outside the repository. Rerun the Compose policy test; expect PASS.

- [ ] **Step 4: Write and run the failing access-boundary test**

Cover clinic access with a registered device certificate, remote admin through WireGuard with a registered admin certificate, remote doctor/reception denial, revoked/unregistered certificate denial, direct API port denial, forged context-header removal, wrong Caddy client certificate denial at the API, and source-range-only access denial. Run `bash docker/tests/access-boundary.test.sh`; expect FAIL.

- [ ] **Step 5: Implement reverse-proxy and trusted-gateway configuration**

Caddy's external listener requires a device certificate signed by the clinic device CA, strips caller-provided context headers, maps the certificate fingerprint/serial to the request, and classifies clinic versus WireGuard context only after mTLS succeeds. A separate non-published internal listener accepts only the `admin-web` container's BFF calls and forwards the HMAC-authenticated login/session exchange. Both listeners reach the API with Caddy's own client certificate; the API rejects gateway headers unless that mTLS peer matches `GATEWAY_CLIENT_CERT_FINGERPRINT`. User role/OIDC and registered-device checks remain backend decisions. No direct API, database, or object-storage route is exposed. Rerun the access-boundary test; expect PASS.

- [ ] **Step 6: Write and run failing backup/restore tests**

Test backup-age rejection plus a disposable drill that inserts a marker row and versioned object, captures a target time, changes/deletes them, restores to the target, and asserts row/object checksum recovery with measured RTO under 4 hours and RPO at most 15 minutes. Run `bash docker/tests/restore-drill.test.sh`; expect FAIL.

- [ ] **Step 7: Implement backup verification and disposable restore automation**

Configure `postgresql.conf` with pgBackRest `archive_command`/restore settings and `pgbackrest.conf` with a host-mounted repository outside the VM data volume. Implement the two CLI contracts, pgBackRest base-backup/WAL point-in-time restore, MinIO object-version restore, cleanup traps, and JSON evidence output. Rerun backup/restore tests; expect PASS. These scripts prove fake-data recovery mechanics but do not approve the single-host topology for production.

- [ ] **Step 8: Write and run the failing monitoring configuration test**

Assert Prometheus scrapes web/API plus `node-exporter`, `cadvisor`, `postgres-exporter`, and MinIO metrics; alert rules cover service unavailable, readiness failure, backup too old, host/container/storage pressure, PostgreSQL health, and repeated authorization denial; assert Alertmanager has a configured non-secret receiver placeholder. Run `bash docker/tests/monitoring-config.test.sh`; expect FAIL.

- [ ] **Step 9: Implement monitoring and alert configuration**

Add `prometheus.yml`, `alert-rules.yml`, and `alertmanager.yml`; mount them read-only from Compose. Rerun the monitoring test; expect PASS.

- [ ] **Step 10: Write and run the failing Ansible idempotency test**

Assert the playbook creates the service account/directories, installs the supported container runtime, copies only non-secret deployment files, verifies externally supplied secret paths, and calls deployment by image digest. Run `bash docker/tests/ansible-idempotency.test.sh`; expect FAIL.

- [ ] **Step 11: Implement VM provisioning and digest-based deployment**

Implement the listed inventory, variables, role, playbook, and `deploy-staging.sh`. Run against a disposable target twice; the second Ansible run must report zero changes. Do not put VM credentials, OIDC secrets, or real patient data in Git or test fixtures.

- [ ] **Step 12: Execute the disposable restore drill and capture evidence**

Run `bash docker/scripts/restore-drill.sh --environment disposable --target-time <ISO-8601>` and require exit 0, RTO under 4 hours, RPO no more than 15 minutes, and row/object checksum match in `artifacts/operations/`.

- [ ] **Step 13: Write runbooks from verified commands**

Document bootstrap/deploy/rollback, restore decision and evidence, account/device revocation, alert response, secret rotation, the fake-data-only boundary, and the production external-review gate. Every command in the runbooks must correspond to a tested script or Ansible entry point above.

- [ ] **Step 14: Run the infrastructure gate and commit**

Run: `bash docker/tests/staging-compose.test.sh && bash docker/tests/access-boundary.test.sh && bash docker/tests/monitoring-config.test.sh && bash docker/tests/ansible-idempotency.test.sh && bash docker/tests/restore-drill.test.sh`

Expected: all commands exit 0.

```bash
git add docs/adr/README.md docs/adr/0003-fake-data-staging-and-artifact-promotion.md docker docs/runbooks docs/operations
git commit -m "ops: add secure deployment and tested recovery"
```

### Task 9: Verify the secure foundation end to end

**Files:**

- Create: `tests/e2e/playwright.config.ts`
- Create: `tests/e2e/fixtures/foundation.ts`
- Create: `tests/e2e/support/test-oidc-issuer.ts`
- Create: `tests/e2e/support/test-gateway.ts`
- Create: `tests/e2e/foundation-security.spec.ts`
- Create: `docker/e2e/compose.yaml`
- Modify: `api-skinlab/src/app.module.ts`
- Modify: `admin-skinlab/src/features/auth/server/api-session-client.ts`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: Implemented identity, database, audit, media, and jobs modules; web BFF session adapter; digest-pinned test containers.
- Produces: `startFoundationHarness(): Promise<FoundationHarness>` supplying web/API URLs, deterministic test issuer, signed gateway context, registered/unregistered devices, doctor/reception/admin identities, and private-object fixtures; root/CI gate `pnpm test:e2e:foundation`.

- [ ] **Step 1: Write end-to-end security journeys**

Cover doctor login at clinic with a registered device certificate and `acr=2`, receptionist denied remotely, admin allowed through WireGuard with a registered device and `acr=2`, `acr<2` denied, revoked device/session denied, private object access denied to the wrong role, expired signed URL denied, forged gateway context/wrong Caddy mTLS peer denied, and duplicate request producing one domain write/audit event.

- [ ] **Step 2: Run the E2E suite against the declared test stack**

Run: `pnpm test:e2e:foundation`

Expected: FAIL because the composition registration and deterministic harness are not wired.

- [ ] **Step 3: Register the already-implemented foundation modules**

Register identity, database, audit, media, and jobs modules explicitly in `api-skinlab/src/app.module.ts`; do not add business-domain modules.

- [ ] **Step 4: Wire the web session client to the API session endpoints**

Update only `api-session-client.ts` to call the Task 4 create/get/refresh/revoke endpoints and propagate correlation IDs; no client component receives access or refresh tokens.

- [ ] **Step 5: Implement the deterministic E2E harness**

Implement `docker/e2e/compose.yaml`, the test issuer/JWKS, signed gateway contexts, fake identities/devices, private-object fixtures, deterministic clock, teardown, and `startFoundationHarness`. All identities and data are visibly synthetic.

- [ ] **Step 6: Run the E2E suite to green**

Run: `pnpm test:e2e:foundation`

Expected: all foundation security journeys pass. If a product implementation fails, return to its owning Task 3–7 rather than adding an undocumented workaround here.

- [ ] **Step 7: Add the root and CI gates**

Expose the exact command in root `package.json` and add it to the `quality` CI job after integration tests. CI uploads only sanitized test reports and never container secrets.

- [ ] **Step 8: Run the complete quality gate**

Run: `pnpm security:secrets && pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm test:e2e:foundation && pnpm build`

Expected: all commands exit 0.

- [ ] **Step 9: Commit**

```bash
git add tests/e2e docker/e2e api-skinlab/src/app.module.ts admin-skinlab/src/features/auth/server/api-session-client.ts package.json .github/workflows/ci.yml
git commit -m "test: verify secure platform foundation"
```
