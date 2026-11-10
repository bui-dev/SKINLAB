import { describe, expect, it } from "vitest";

import {
  GatewayAssertionError,
  createGatewayAssertion,
  verifyGatewayAssertion,
} from "./gateway-assertion";

const key = Buffer.alloc(32, 4).toString("base64");
const now = new Date("2026-11-10T09:00:00.000Z");

describe("gateway assertion", () => {
  const assertion = createGatewayAssertion(
    {
      id: "gateway-assertion-01",
      issuedAt: new Date("2026-11-10T08:59:30.000Z"),
      expiresAt: new Date("2026-11-10T09:00:30.000Z"),
      method: "POST",
      target: "/internal/sessions",
      bodyHash: "body-hash-01",
      deviceFingerprint:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      context: "clinic",
    },
    key,
  );

  it("verifies_a_fresh_request_bound_gateway_assertion", async () => {
    await expect(
      verifyGatewayAssertion(assertion, key, {
        method: "POST",
        target: "/internal/sessions",
        bodyHash: "body-hash-01",
        now,
        consume: async () => true,
      }),
    ).resolves.toMatchObject({ context: "clinic", id: "gateway-assertion-01" });
  });

  it.each([
    [
      "changed request",
      {
        method: "POST",
        target: "/internal/sessions",
        bodyHash: "changed",
        now,
        consume: async () => true,
      },
    ],
    [
      "replay",
      {
        method: "POST",
        target: "/internal/sessions",
        bodyHash: "body-hash-01",
        now,
        consume: async () => false,
      },
    ],
    [
      "expiry",
      {
        method: "POST",
        target: "/internal/sessions",
        bodyHash: "body-hash-01",
        now: new Date("2026-11-10T09:00:30.000Z"),
        consume: async () => true,
      },
    ],
  ])("rejects_%s", (_label, input) => {
    return expect(
      verifyGatewayAssertion(assertion, key, input),
    ).rejects.toThrow(GatewayAssertionError);
  });

  it("rejects_an_assertion_with_a_lifetime_longer_than_sixty_seconds", async () => {
    const longLivedAssertion = createGatewayAssertion(
      {
        ...assertion,
        id: "gateway-assertion-too-long",
        expiresAt: new Date("2026-11-10T09:01:00.001Z"),
      },
      key,
    );

    await expect(
      verifyGatewayAssertion(longLivedAssertion, key, {
        method: "POST",
        target: "/internal/sessions",
        bodyHash: "body-hash-01",
        now,
        consume: async () => true,
      }),
    ).rejects.toThrow(GatewayAssertionError);
  });
});
