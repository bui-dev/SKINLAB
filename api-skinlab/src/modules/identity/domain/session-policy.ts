import type { AccessContextKind, Role } from "@skinlab/contracts";

export type SessionPolicy = {
  idleMilliseconds: number;
  absoluteMilliseconds: number;
};

export function getSessionPolicy(
  role: Role,
  context: AccessContextKind,
): SessionPolicy {
  if (context === "remote" && role === "admin") {
    return {
      idleMilliseconds: 15 * 60_000,
      absoluteMilliseconds: 4 * 60 * 60_000,
    };
  }
  if (context === "remote")
    throw new Error("Remote sessions are restricted to administrators.");
  return {
    idleMilliseconds: 30 * 60_000,
    absoluteMilliseconds: 8 * 60 * 60_000,
  };
}

export function getSessionUsableUntil(
  lastActivityAt: Date,
  absoluteExpiresAt: Date,
  policy: SessionPolicy,
): Date {
  const idleDeadline = new Date(
    lastActivityAt.getTime() + policy.idleMilliseconds,
  );
  return idleDeadline < absoluteExpiresAt ? idleDeadline : absoluteExpiresAt;
}
