import type { AccessContextKind, Role } from "@skinlab/contracts";

export type UserSession = {
  id: string;
  subject: string;
  role: Role;
  acr: string;
  deviceFingerprint: string;
  accessContext: AccessContextKind;
  expiresAt: Date;
};
