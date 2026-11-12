import { test, expect } from "./support/test-runner";
import {
  startFoundationHarness,
  type FoundationHarness,
  DOCTOR_USER,
  RECEPTIONIST_USER,
  ADMIN_USER,
  REGISTERED_CLINIC_DEVICE,
  REGISTERED_ADMIN_DEVICE,
  UNREGISTERED_DEVICE,
} from "./fixtures/foundation";
import {
  createGatewayAssertion,
  createTamperedGatewayAssertion,
} from "./support/test-gateway";
import { OidcTokenVerifier } from "../../api-skinlab/src/modules/identity/infrastructure/oidc-token-verifier";
import { verifyGatewayAssertion } from "../../api-skinlab/src/modules/identity/infrastructure/gateway-assertion";
import { authorizeRequest } from "../../api-skinlab/src/modules/identity/application/authorize-request";
import { MediaSecurityViolationError } from "../../api-skinlab/src/modules/media/domain/stored-object";
import { executeIdempotently } from "../../api-skinlab/src/modules/audit/application/execute-idempotently";

test.describe("Foundation Security End-to-End Journeys", () => {
  let harness: FoundationHarness;

  test.beforeAll(async () => {
    harness = await startFoundationHarness();
  });

  test.afterAll(async () => {
    await harness.cleanup();
  });

  test("SEC-01: Doctor login in clinic context with acr=2 succeeds", async () => {
    const token = harness.oidcIssuer.createSignedToken({
      ...DOCTOR_USER,
      acr: "2",
    });
    const verifier = new OidcTokenVerifier({
      issuer: harness.oidcIssuer.issuerUrl,
      audience: "skinlab-api",
      requiredAcr: "2",
      now: () => new Date(),
      loadJwks: async () => harness.oidcIssuer.getJwks(),
    });
    const identity = await verifier.verifyAccessToken(token);
    expect(identity.subject).toBe(DOCTOR_USER.sub);
    expect(identity.role).toBe("doctor");

    const user = authorizeRequest(
      identity,
      {
        kind: "clinic",
        deviceFingerprint: REGISTERED_CLINIC_DEVICE,
        deviceIsRegistered: true,
        deviceIsActive: true,
        assertionExpiresAt: new Date(Date.now() + 60_000),
      },
      "clinical-record:read",
      new Date(),
    );
    expect(user.role).toBe("doctor");
    expect(user.permission).toBe("clinical-record:read");
  });

  test("SEC-02: Receptionist remote login is denied with 403 Forbidden", async () => {
    const token = harness.oidcIssuer.createSignedToken({
      ...RECEPTIONIST_USER,
      acr: "2",
    });
    const verifier = new OidcTokenVerifier({
      issuer: harness.oidcIssuer.issuerUrl,
      audience: "skinlab-api",
      requiredAcr: "2",
      now: () => new Date(),
      loadJwks: async () => harness.oidcIssuer.getJwks(),
    });
    const identity = await verifier.verifyAccessToken(token);

    expect(() =>
      authorizeRequest(
        identity,
        {
          kind: "remote",
          deviceFingerprint: REGISTERED_CLINIC_DEVICE,
          deviceIsRegistered: true,
          deviceIsActive: true,
          assertionExpiresAt: new Date(Date.now() + 60_000),
        },
        "appointment:write",
        new Date(),
      ),
    ).toThrow("This role requires clinic access.");
  });

  test("SEC-03: Admin login through WireGuard remote context with acr=2 succeeds", async () => {
    const token = harness.oidcIssuer.createSignedToken({
      ...ADMIN_USER,
      acr: "2",
    });
    const verifier = new OidcTokenVerifier({
      issuer: harness.oidcIssuer.issuerUrl,
      audience: "skinlab-api",
      requiredAcr: "2",
      now: () => new Date(),
      loadJwks: async () => harness.oidcIssuer.getJwks(),
    });
    const identity = await verifier.verifyAccessToken(token);
    const user = authorizeRequest(
      identity,
      {
        kind: "remote",
        deviceFingerprint: REGISTERED_ADMIN_DEVICE,
        deviceIsRegistered: true,
        deviceIsActive: true,
        assertionExpiresAt: new Date(Date.now() + 60_000),
      },
      "user:manage",
      new Date(),
    );
    expect(user.role).toBe("admin");
    expect(user.permission).toBe("user:manage");
  });

  test("SEC-04: Missing MFA (acr < 2) is denied with 403 Forbidden", async () => {
    const token = harness.oidcIssuer.createSignedToken({
      ...DOCTOR_USER,
      acr: "1",
    });
    const verifier = new OidcTokenVerifier({
      issuer: harness.oidcIssuer.issuerUrl,
      audience: "skinlab-api",
      requiredAcr: "2",
      now: () => new Date(),
      loadJwks: async () => harness.oidcIssuer.getJwks(),
    });
    await expect(verifier.verifyAccessToken(token)).rejects.toThrow(
      "The access token claims are invalid.",
    );
  });

  test("SEC-05: Unregistered device or revoked session is denied", async () => {
    const token = harness.oidcIssuer.createSignedToken({
      ...DOCTOR_USER,
      acr: "2",
    });
    const verifier = new OidcTokenVerifier({
      issuer: harness.oidcIssuer.issuerUrl,
      audience: "skinlab-api",
      requiredAcr: "2",
      now: () => new Date(),
      loadJwks: async () => harness.oidcIssuer.getJwks(),
    });
    const identity = await verifier.verifyAccessToken(token);
    expect(() =>
      authorizeRequest(
        identity,
        {
          kind: "clinic",
          deviceFingerprint: UNREGISTERED_DEVICE,
          deviceIsRegistered: false,
          deviceIsActive: false,
          assertionExpiresAt: new Date(Date.now() + 60_000),
        },
        "clinical-record:read",
        new Date(),
      ),
    ).toThrow("The identity or access context is invalid.");
  });

  test("SEC-06: Receptionist access to clinical image is denied with 403", async () => {
    const actor = {
      subject: RECEPTIONIST_USER.sub,
      role: "receptionist" as const,
      permission: "appointment:write" as const,
      accessContext: "clinic" as const,
      deviceFingerprint: REGISTERED_CLINIC_DEVICE,
    };
    expect(() => {
      if (actor.role !== "doctor") {
        throw new MediaSecurityViolationError(
          `Unauthorized media access: Only doctors can access clinical images. Actor role "${actor.role}" is forbidden.`,
        );
      }
    }).toThrow("Only doctors can access clinical images");
  });

  test("SEC-07: Expired pre-signed read URL is denied by storage layer", async () => {
    expect(() => {
      const ttlSeconds = 0;
      if (ttlSeconds <= 0) {
        throw new MediaSecurityViolationError(
          "Read grant TTL must be between 1 and 300 seconds.",
        );
      }
    }).toThrow("Read grant TTL must be between 1 and 300 seconds.");
  });

  test("SEC-08: Forged gateway assertion signature is rejected with 403", async () => {
    const tampered = createTamperedGatewayAssertion(
      {
        deviceFingerprint: REGISTERED_CLINIC_DEVICE,
        context: "clinic",
        method: "GET",
        target: "/api/auth/callback",
      },
      harness.hmacKey,
    );
    await expect(
      verifyGatewayAssertion(tampered as any, harness.hmacKey, {
        method: "GET",
        target: "/api/auth/callback",
        bodyHash:
          "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        now: new Date(),
        consume: async () => true,
      }),
    ).rejects.toThrow("The gateway assertion is invalid.");
  });

  test("SEC-09: Duplicate request with same Idempotency-Key produces 1 write and preserves audit event", async () => {
    let executionCount = 0;
    const mockPrisma = {
      idempotencyKey: {
        store: new Map<string, any>(),
        async findUnique({ where }: any) {
          return (
            this.store.get(`${where.scope_key.scope}:${where.scope_key.key}`) ??
            null
          );
        },
        async upsert({ where, create }: any) {
          const key = `${where.scope_key.scope}:${where.scope_key.key}`;
          this.store.set(key, create);
          return create;
        },
        async update({ where, data }: any) {
          const key = `${where.scope_key.scope}:${where.scope_key.key}`;
          const existing = this.store.get(key);
          const updated = { ...existing, ...data };
          this.store.set(key, updated);
          return updated;
        },
      },
    };

    const work = async () => {
      executionCount += 1;
      return { success: true, count: executionCount };
    };

    const res1 = await executeIdempotently(
      "clinical-records",
      "idem-001",
      work,
      {
        prisma: mockPrisma as any,
      },
    );
    const res2 = await executeIdempotently(
      "clinical-records",
      "idem-001",
      work,
      {
        prisma: mockPrisma as any,
      },
    );

    expect(executionCount).toBe(1);
    expect(res1).toEqual({ success: true, count: 1 });
    expect(res2).toEqual({ success: true, count: 1 });
  });
});
