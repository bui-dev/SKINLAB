import { roles, type AccessContextKind, type Role } from "@skinlab/contracts";

export class AuditSecurityViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditSecurityViolationError";
  }
}

export type AuditActor = {
  subject: string;
  role: Role;
  accessContext: AccessContextKind;
  deviceFingerprint: string;
};

export type AuditEventInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  actor: AuditActor;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

export type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
};

const FORBIDDEN_FIELD_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /authorization/i,
  /cookie/i,
  /codeverifier/i,
  /refreshtoken/i,
  /accesstoken/i,
  /tokenencryptionkey/i,
];

const BASE64_IMAGE_PREFIX = "data:image/";
const MAX_ALLOWED_BASE64_LENGTH = 2048;

function assertSafeValue(key: string, value: unknown, path: string): void {
  for (const pattern of FORBIDDEN_FIELD_PATTERNS) {
    if (pattern.test(key)) {
      throw new AuditSecurityViolationError(
        `Sensitive secret field "${path}" is strictly forbidden in audit logs.`,
      );
    }
  }

  if (typeof value === "string") {
    if (value.startsWith(BASE64_IMAGE_PREFIX)) {
      throw new AuditSecurityViolationError(
        `Raw binary/base64 clinical image data at "${path}" cannot be placed in audit logs. Store media references instead.`,
      );
    }

    if (value.length > MAX_ALLOWED_BASE64_LENGTH && /^[A-Za-z0-9+/=]+$/.test(value)) {
      throw new AuditSecurityViolationError(
        `Large base64 payload at "${path}" exceeds maximum permitted length for audit logging.`,
      );
    }
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      assertSafeValue(key, value[i], `${path}[${i}]`);
    }
  } else if (value !== null && typeof value === "object") {
    for (const [subKey, subVal] of Object.entries(value as Record<string, unknown>)) {
      assertSafeValue(subKey, subVal, path ? `${path}.${subKey}` : subKey);
    }
  }
}

export function sanitizeAuditPayload(input: AuditEventInput): AuditEventInput {
  if (!input.action || input.action.trim().length === 0) {
    throw new Error("Audit action cannot be empty.");
  }
  if (!input.entityType || input.entityType.trim().length === 0) {
    throw new Error("Audit entityType cannot be empty.");
  }
  if (!input.actor?.subject || input.actor.subject.trim().length === 0) {
    throw new Error("Audit actor subject is required.");
  }
  if (!input.actor?.role || !(roles as readonly string[]).includes(input.actor.role)) {
    throw new Error(`Audit actor role must be a valid Role: ${roles.join(", ")}.`);
  }
  if (
    !input.actor?.accessContext ||
    (input.actor.accessContext !== "clinic" && input.actor.accessContext !== "remote")
  ) {
    throw new Error("Audit actor accessContext must be either 'clinic' or 'remote'.");
  }
  if (
    !input.actor?.deviceFingerprint ||
    input.actor.deviceFingerprint.trim().length === 0
  ) {
    throw new Error("Audit actor deviceFingerprint is required.");
  }

  if (input.metadata) {
    for (const [key, value] of Object.entries(input.metadata)) {
      assertSafeValue(key, value, `metadata.${key}`);
    }
  }

  if (input.before) {
    for (const [key, value] of Object.entries(input.before)) {
      assertSafeValue(key, value, `before.${key}`);
    }
  }

  if (input.after) {
    for (const [key, value] of Object.entries(input.after)) {
      assertSafeValue(key, value, `after.${key}`);
    }
  }

  return input;
}

