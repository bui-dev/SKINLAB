import type { AccessContextKind } from "@skinlab/contracts";

import type { AccessContext } from "../domain/authenticated-user";

export class GatewayContextVerificationError extends Error {}

export type GatewayAssertion = {
  id: string;
  issuedAt: Date;
  expiresAt: Date;
  method: string;
  target: string;
  bodyHash: string;
  deviceFingerprint: string;
  context: AccessContextKind;
  signature: string;
};

export type VerifyGatewayContextInput = {
  tlsPeerFingerprint: string;
  configuredGatewayFingerprint: string;
  assertion: GatewayAssertion;
  request: Pick<GatewayAssertion, "method" | "target" | "bodyHash">;
  now: Date;
  verifySignature: (assertion: GatewayAssertion) => boolean;
  isAssertionReplay: (assertionId: string) => boolean;
  findRegisteredDevice: (
    fingerprint: string,
  ) => { isActive: boolean } | null;
};

export function verifyGatewayContext(
  input: VerifyGatewayContextInput,
): AccessContext {
  const { assertion } = input;
  const device = input.findRegisteredDevice(assertion.deviceFingerprint);

  if (
    input.tlsPeerFingerprint !== input.configuredGatewayFingerprint ||
    assertion.issuedAt > input.now ||
    assertion.expiresAt <= input.now ||
    assertion.method !== input.request.method ||
    assertion.target !== input.request.target ||
    assertion.bodyHash !== input.request.bodyHash ||
    !input.verifySignature(assertion) ||
    input.isAssertionReplay(assertion.id) ||
    !device
  ) {
    throw new GatewayContextVerificationError("Gateway context is invalid.");
  }

  return {
    kind: assertion.context,
    deviceFingerprint: assertion.deviceFingerprint,
    deviceIsRegistered: true,
    deviceIsActive: device.isActive,
    assertionExpiresAt: assertion.expiresAt,
  };
}
