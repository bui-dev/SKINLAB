import { describe, expect, it } from "vitest";

import {
  GatewayContextVerificationError,
  verifyGatewayContext,
} from "./mtls-gateway-context-verifier";

const configuredGatewayFingerprint =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const managedDeviceFingerprint =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const now = new Date("2026-11-10T09:00:00.000Z");

const signedAssertion = {
  id: "gateway-assertion-01",
  issuedAt: new Date("2026-11-10T08:59:30.000Z"),
  expiresAt: new Date("2026-11-10T09:00:30.000Z"),
  method: "POST",
  target: "/internal/sessions",
  bodyHash: "body-hash-01",
  deviceFingerprint: managedDeviceFingerprint,
  context: "clinic",
  signature: "valid-signature",
} as const;

describe("verifyGatewayContext", () => {
  it("accepts_a_fresh_request_bound_assertion_from_the_configured_gateway_peer", () => {
    const context = verifyGatewayContext({
      tlsPeerFingerprint: configuredGatewayFingerprint,
      configuredGatewayFingerprint,
      assertion: signedAssertion,
      request: {
        method: "POST",
        target: "/internal/sessions",
        bodyHash: "body-hash-01",
      },
      now,
      verifySignature: () => true,
      isAssertionReplay: () => false,
      findRegisteredDevice: (fingerprint) =>
        fingerprint === managedDeviceFingerprint ? { isActive: true } : null,
    });

    expect(context).toMatchObject({
      kind: "clinic",
      deviceFingerprint: managedDeviceFingerprint,
      deviceIsRegistered: true,
      deviceIsActive: true,
    });
  });

  it.each([
    ["forged forwarded headers without the configured mTLS peer", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", signedAssertion],
    ["a stale assertion", configuredGatewayFingerprint, { ...signedAssertion, expiresAt: new Date("2026-11-10T08:59:59.999Z") }],
    ["a request binding mismatch", configuredGatewayFingerprint, { ...signedAssertion, bodyHash: "different-body" }],
  ])("rejects_%s", (_label, tlsPeerFingerprint, assertion) => {
    expect(() =>
      verifyGatewayContext({
        tlsPeerFingerprint,
        configuredGatewayFingerprint,
        assertion,
        request: {
          method: "POST",
          target: "/internal/sessions",
          bodyHash: "body-hash-01",
        },
        now,
        verifySignature: () => true,
        isAssertionReplay: () => false,
        findRegisteredDevice: () => ({ isActive: true }),
      }),
    ).toThrow(GatewayContextVerificationError);
  });
});
