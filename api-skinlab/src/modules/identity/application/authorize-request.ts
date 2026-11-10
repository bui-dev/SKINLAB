import type { Permission, Role } from "@skinlab/contracts";

import type {
  AccessContext,
  AuthenticatedUser,
  VerifiedIdentity,
} from "../domain/authenticated-user";

export class AuthorizationError extends Error {}

const permissionsByRole: Readonly<Record<Role, readonly Permission[]>> = {
  doctor: ["clinical-record:read"],
  receptionist: ["appointment:write"],
  admin: ["user:manage"],
};

export function authorizeRequest(
  identity: VerifiedIdentity,
  context: AccessContext,
  permission: Permission,
  now: Date,
): AuthenticatedUser {
  if (
    !identity.isEnabled ||
    identity.acr !== "2" ||
    identity.expiresAt <= now ||
    !context.deviceIsRegistered ||
    !context.deviceIsActive ||
    context.assertionExpiresAt <= now
  ) {
    throw new AuthorizationError("The identity or access context is invalid.");
  }

  if (
    (identity.role === "doctor" || identity.role === "receptionist") &&
    context.kind !== "clinic"
  ) {
    throw new AuthorizationError("This role requires clinic access.");
  }

  if (!permissionsByRole[identity.role].includes(permission)) {
    throw new AuthorizationError("The role does not have this permission.");
  }

  return {
    subject: identity.subject,
    role: identity.role,
    permission,
    accessContext: context.kind,
    deviceFingerprint: context.deviceFingerprint,
  };
}
