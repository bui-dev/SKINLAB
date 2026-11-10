import type {
  AccessContextKind,
  Permission,
  Role,
} from "@skinlab/contracts";

export type VerifiedIdentity = {
  issuer: string;
  audience: string;
  subject: string;
  role: Role;
  acr: string;
  expiresAt: Date;
  isEnabled: boolean;
};

export type AccessContext = {
  kind: AccessContextKind;
  deviceFingerprint: string;
  deviceIsRegistered: boolean;
  deviceIsActive: boolean;
  assertionExpiresAt: Date;
};

export type AuthenticatedUser = {
  subject: string;
  role: Role;
  permission: Permission;
  accessContext: AccessContextKind;
  deviceFingerprint: string;
};
