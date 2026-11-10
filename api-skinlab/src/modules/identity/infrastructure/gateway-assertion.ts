import { createHmac, timingSafeEqual } from "node:crypto";

import type { AccessContextKind } from "@skinlab/contracts";

export type GatewayAssertionPayload = {
  id: string;
  issuedAt: Date;
  expiresAt: Date;
  method: string;
  target: string;
  bodyHash: string;
  deviceFingerprint: string;
  context: AccessContextKind;
};

export type GatewayAssertion = GatewayAssertionPayload & { signature: string };

export class GatewayAssertionError extends Error {}

const maximumAssertionLifetimeMilliseconds = 60_000;

export function createGatewayAssertion(
  payload: GatewayAssertionPayload,
  key: string,
): GatewayAssertion {
  return { ...payload, signature: sign(payload, key) };
}

export async function verifyGatewayAssertion(
  assertion: GatewayAssertion,
  key: string,
  request: Pick<GatewayAssertionPayload, "method" | "target" | "bodyHash"> & {
    now: Date;
    consume: (id: string, expiresAt: Date) => Promise<boolean>;
  },
): Promise<GatewayAssertionPayload> {
  if (
    assertion.issuedAt > request.now ||
    assertion.expiresAt <= request.now ||
    assertion.expiresAt.getTime() - assertion.issuedAt.getTime() >
      maximumAssertionLifetimeMilliseconds ||
    assertion.method !== request.method ||
    assertion.target !== request.target ||
    assertion.bodyHash !== request.bodyHash ||
    !safeEqual(assertion.signature, sign(assertion, key))
  ) {
    throw new GatewayAssertionError("The gateway assertion is invalid.");
  }

  if (!(await request.consume(assertion.id, assertion.expiresAt))) {
    throw new GatewayAssertionError(
      "The gateway assertion has already been used.",
    );
  }

  return assertion;
}

function sign(payload: GatewayAssertionPayload, key: string): string {
  return createHmac("sha256", Buffer.from(key, "base64"))
    .update(
      [
        payload.id,
        payload.issuedAt.toISOString(),
        payload.expiresAt.toISOString(),
        payload.method,
        payload.target,
        payload.bodyHash,
        payload.deviceFingerprint,
        payload.context,
      ].join("\n"),
    )
    .digest("base64url");
}

function safeEqual(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual, "base64url");
  const expectedBytes = Buffer.from(expected, "base64url");
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}
