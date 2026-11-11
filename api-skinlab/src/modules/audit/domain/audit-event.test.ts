import type { AccessContextKind, Role } from "@skinlab/contracts";
import { describe, expect, it } from "vitest";

import {
  AuditSecurityViolationError,
  sanitizeAuditPayload,
} from "./audit-event";

describe("audit-event domain", () => {
  const validActor = {
    subject: "user-1",
    role: "doctor" as const,
    accessContext: "clinic" as const,
    deviceFingerprint: "sha256:fp-1",
  };

  it("accepts a fully valid audit event input", () => {
    const input = {
      action: "appointment.check_in",
      entityType: "appointment",
      entityId: "app-100",
      actor: validActor,
      metadata: { reason: "Routine checkup" },
    };

    const sanitized = sanitizeAuditPayload(input);
    expect(sanitized.action).toBe("appointment.check_in");
    expect(sanitized.actor.role).toBe("doctor");
  });

  it("throws when action or entityType is missing", () => {
    expect(() =>
      sanitizeAuditPayload({
        action: "",
        entityType: "appointment",
        actor: validActor,
      }),
    ).toThrow("Audit action cannot be empty.");

    expect(() =>
      sanitizeAuditPayload({
        action: "test",
        entityType: "   ",
        actor: validActor,
      }),
    ).toThrow("Audit entityType cannot be empty.");
  });

  it("throws when actor subject, role, or accessContext is invalid", () => {
    expect(() =>
      sanitizeAuditPayload({
        action: "test",
        entityType: "test",
        actor: { ...validActor, subject: "" },
      }),
    ).toThrow("Audit actor subject is required.");

    expect(() =>
      sanitizeAuditPayload({
        action: "test",
        entityType: "test",
        actor: { ...validActor, role: "invalid-role" as unknown as Role },
      }),
    ).toThrow("Audit actor role must be a valid Role");

    expect(() =>
      sanitizeAuditPayload({
        action: "test",
        entityType: "test",
        actor: { ...validActor, accessContext: "outside" as unknown as AccessContextKind },
      }),
    ).toThrow("Audit actor accessContext must be either 'clinic' or 'remote'.");
  });

  it("rejects sensitive tokens or passwords in metadata", () => {
    expect(() =>
      sanitizeAuditPayload({
        action: "auth.login",
        entityType: "session",
        actor: validActor,
        metadata: { refreshToken: "secret-token-123" },
      }),
    ).toThrow(AuditSecurityViolationError);

    expect(() =>
      sanitizeAuditPayload({
        action: "auth.login",
        entityType: "session",
        actor: validActor,
        metadata: { nested: { userPassword: "secret" } },
      }),
    ).toThrow(AuditSecurityViolationError);
  });

  it("rejects sensitive keys inside nested arrays", () => {
    expect(() =>
      sanitizeAuditPayload({
        action: "auth.batch",
        entityType: "session",
        actor: validActor,
        metadata: {
          items: [{ key: "value" }, { secretToken: "my-secret" }],
        },
      }),
    ).toThrow(AuditSecurityViolationError);
  });

  it("rejects raw base64 image data", () => {
    expect(() =>
      sanitizeAuditPayload({
        action: "clinical.image.save",
        entityType: "clinical_record",
        actor: validActor,
        metadata: { photo: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..." },
      }),
    ).toThrow(AuditSecurityViolationError);

    // Rejection of large raw base64 string
    const largeBase64 = "A".repeat(2049);
    expect(() =>
      sanitizeAuditPayload({
        action: "clinical.image.save",
        entityType: "clinical_record",
        actor: validActor,
        metadata: { rawData: largeBase64 },
      }),
    ).toThrow(AuditSecurityViolationError);
  });
});
