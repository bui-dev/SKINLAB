import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  authorizeRequest,
} from "./authorize-request";

const now = new Date("2026-11-10T09:00:00.000Z");

const validIdentity = {
  issuer: "https://identity.skinlab.test",
  audience: "skinlab-api",
  subject: "user-doctor-01",
  role: "doctor",
  acr: "2",
  expiresAt: new Date("2026-11-10T10:00:00.000Z"),
  isEnabled: true,
} as const;

const clinicContext = {
  kind: "clinic",
  deviceFingerprint:
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  deviceIsRegistered: true,
  deviceIsActive: true,
  assertionExpiresAt: new Date("2026-11-10T09:01:00.000Z"),
} as const;

describe("authorizeRequest", () => {
  it("authorizes_a_doctor_at_the_clinic_on_an_active_registered_device", () => {
    const user = authorizeRequest(
      validIdentity,
      clinicContext,
      "clinical-record:read",
      now,
    );

    expect(user).toMatchObject({
      subject: "user-doctor-01",
      role: "doctor",
      accessContext: "clinic",
    });
  });

  it("rejects_reception_when_the_clinic_access_context_is_absent", () => {
    expect(() =>
      authorizeRequest(
        { ...validIdentity, role: "receptionist" },
        { ...clinicContext, kind: "remote" },
        "appointment:write",
        now,
      ),
    ).toThrow(AuthorizationError);
  });

  it("authorizes_remote_admin_only_with_required_assurance", () => {
    const user = authorizeRequest(
      { ...validIdentity, role: "admin" },
      { ...clinicContext, kind: "remote" },
      "user:manage",
      now,
    );

    expect(user.role).toBe("admin");
  });

  it.each([
    ["insufficient assurance", { acr: "1" }],
    ["disabled user", { isEnabled: false }],
    ["expired identity", { expiresAt: new Date("2026-11-10T08:59:59.999Z") }],
  ])("rejects_%s", (_label, identityPatch) => {
    expect(() =>
      authorizeRequest(
        { ...validIdentity, ...identityPatch },
        clinicContext,
        "clinical-record:read",
        now,
      ),
    ).toThrow(AuthorizationError);
  });

  it.each([
    ["unregistered device", { deviceIsRegistered: false }],
    ["revoked device", { deviceIsActive: false }],
    [
      "expired gateway assertion",
      { assertionExpiresAt: new Date("2026-11-10T08:59:59.999Z") },
    ],
  ])("rejects_%s", (_label, contextPatch) => {
    expect(() =>
      authorizeRequest(
        validIdentity,
        { ...clinicContext, ...contextPatch },
        "clinical-record:read",
        now,
      ),
    ).toThrow(AuthorizationError);
  });
});
