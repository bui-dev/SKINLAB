# ADR-0002: Identity, session, and access boundary

**Status:** Accepted  
**Approval scope:** Provisional — fake-data local/staging only; not ratified for real patient data or production  
**Date:** 2026-11-10  
**Decision owner:** Product Owner / Engineering Coordinator

## Context

SkinLab stores clinical, payment, and inventory information. Shared accounts,
browser-held bearer tokens, a UI-only role check, or trust in caller-supplied
network headers would allow an unauthorized person to access or alter that
information.

The approved system design requires individual accounts, MFA for every role,
backend-enforced least privilege, a clinic-approved access path and registered
managed device for doctors and reception, and a remote-admin path with the
same MFA and heightened session controls. The initial implementation must use
only synthetic identities and data.

## Options considered

1. Let the frontend validate identity and attach a bearer token to API calls.
   This is simple but exposes tokens to browser code and cannot establish a
   trustworthy device or network context.
2. Use a hosted/full-stack authentication framework as the authorization
   boundary. This can accelerate setup, but makes the backend authorization
   model and clinic-device policy depend on framework conventions.
3. Use OIDC for identity proofing and MFA, server-side opaque sessions in a
   Next.js BFF, and explicit backend authorization that combines verified
   identity, role, assurance level, device evidence, and gateway access
   context.

## Decision

Use option 3.

- An OIDC provider is the sole issuer of end-user identity and MFA evidence.
  The BFF validates the authorization-code callback ID token for the web
  client audience, issuer, signature, expiry, nonce, state, and PKCE S256
  binding. The API separately validates access tokens for the API audience,
  issuer, signature, expiry, subject, mapped role, and the exact approved
  staging assurance value `acr: "2"`. An ID token or access token alone never
  creates a browser session.
- The browser holds only opaque, `HttpOnly`, `Secure` cookies. Login-attempt
  cookies are `SameSite=Lax` for the OIDC redirect and session cookies are
  `SameSite=Strict`. Access tokens, refresh tokens, state, nonce, PKCE
  verifier, and client secrets stay server-side.
- The Next.js BFF is the only browser-to-identity adapter. Its exchange with
  the API uses an HMAC-authenticated internal channel bound to HTTP method,
  target, body hash, issued-at time, and a one-time nonce. The API stores
  hashes of opaque identifiers/state/nonce and encrypts PKCE verifiers and
  refresh tokens using `TOKEN_ENCRYPTION_KEY`.
- The API authorizes every protected action from verified identity plus a
  gateway access context. The browser-ingress gateway must create a
  short-lived, request-bound signed assertion containing its issued-at/expiry,
  one-time identifier, device certificate fingerprint, allowed clinic/remote
  context, method, target, and body hash. It binds to the original browser
  request, currently `GET /api/auth/callback`; the BFF's later internal API
  command is separately bound by its HMAC. The BFF may reach the API only
  through Caddy's internal mTLS listener, where Caddy presents the configured
  client certificate chained to `INTERNAL_TLS_CLIENT_CA_PATH`. The API
  validates freshness, replay protection, signature, the original-request
  binding, the Caddy TLS peer, and the active registered device. Raw forwarded
  headers, source range, a valid BFF HMAC alone, or another client certificate
  from the same CA never prove a device or user.
- Doctor and reception access requires an active registered device
  certificate fingerprint and clinic context. Admin access may be remote, but
  still requires an active registered device, MFA assurance, and a permitted
  remote context. Disabled users, expired/replayed tokens, revoked sessions,
  unregistered devices, and forged context fail closed.
- Sessions are server-side and opaque. Clinic sessions have a 30-minute idle
  timeout and an eight-hour absolute lifetime. Remote-admin sessions have a
  15-minute idle timeout and a four-hour absolute lifetime. An account marked
  disabled is rejected on every session use and refresh.
  Refresh begins by atomically marking the session refresh-pending; ordinary
  reads fail while it is pending. Refresh-token rotation is serialized,
  tracked server-side, and bound to the original subject/device/access context.
  If the provider rotates a token but the local transaction cannot persist the
  new state, the session remains unavailable and the user reauthenticates.
  Reuse, concurrent refresh, provider failure,
  revocation, logout, and disabled-user states fail closed. A user can be
  globally revoked without deleting historical audit records.
- Cookie-authenticated BFF mutation routes, including refresh and logout,
  accept only `POST` requests with exact same-origin/CSRF validation. Their
  internal request signatures are short-lived and one-time.

## Consequences

### Positive

- The API remains the enforcement point even if a frontend route is bypassed.
- No access or refresh token reaches browser-readable storage.
- Device and network claims cannot be forged by a direct client that does not
  hold the gateway mTLS credential.
- Session revocation and audit attribution have durable server-side records.

### Costs and risks

- OIDC, certificate, key, and session lifecycle configuration add operational
  complexity and require tested fake-data staging before delivery-team use.
- This decision does not select or approve a production identity provider,
  certificate authority, or external gateway. Those remain subject to the
  external technical and compliance gates.
- Cookie and BFF behavior must be validated with end-to-end tests; unit tests
  alone cannot prove browser and gateway boundaries.

## Verification

- Authorization tests cover registered clinic doctor, off-clinic reception,
  remote admin, insufficient `acr`, disabled user, unregistered or revoked
  device, expired token, changed network, forged gateway headers, stale or
  replayed signed assertions, and mismatched request binding.
- Integration tests prove one-time login attempts, callback ID-token binding,
  server-only session creation, serialized refresh rotation, replay rejection,
  provider-success/local-write failure handling, revocation, and logout.
- Token-verifier tests exercise issuer/audience/signature/expiry/JWKS
  rotation/assurance failures without logging raw tokens.
- BFF tests prove cookie attributes, same-origin/CSRF protection, and that
  client code receives no bearer or refresh token.
- Foundation E2E later proves the gateway and API both reject an unapproved
  access context.

## Review record

**Independent AI security review:** Completed 2026-11-10. Findings requiring
request-bound gateway assertions, separate ID/access-token contracts,
fail-closed serialized refresh rotation, and same-origin/CSRF protection are
incorporated in this ADR before source implementation.

**Engineering Coordinator sign-off:** Recorded 2026-11-10 from the project
owner's explicit authorization to implement the remaining Foundation plan in
fake-data local/staging only. This ADR does not authorize real patient data or
production deployment.
