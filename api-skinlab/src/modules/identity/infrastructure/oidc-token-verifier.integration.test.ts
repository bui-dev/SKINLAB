import { generateKeyPairSync, sign } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  OidcTokenVerificationError,
  OidcTokenVerifier,
  type JsonWebKey,
} from "./oidc-token-verifier";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const publicJwk = publicKey.export({ format: "jwk" }) as JsonWebKey;
const now = new Date("2026-11-10T09:00:00.000Z");

function encode(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signedToken(payload: Record<string, unknown>, kid = "key-01"): string {
  const header = encode({ alg: "RS256", kid, typ: "JWT" });
  const body = encode(payload);
  const content = `${header}.${body}`;
  const signature = sign("RSA-SHA256", Buffer.from(content), privateKey).toString(
    "base64url",
  );

  return `${content}.${signature}`;
}

const validPayload = {
  iss: "https://identity.skinlab.test",
  aud: "skinlab-api",
  sub: "doctor-01",
  role: "doctor",
  acr: "2",
  exp: Math.floor(new Date("2026-11-10T10:00:00.000Z").getTime() / 1000),
};

describe("OidcTokenVerifier", () => {
  it("validates_a_signed_access_token_and_refreshes_jwks_for_a_rotated_key", async () => {
    let loadCount = 0;
    const verifier = new OidcTokenVerifier({
      issuer: "https://identity.skinlab.test",
      audience: "skinlab-api",
      requiredAcr: "2",
      now: () => now,
      loadJwks: async () => {
        loadCount += 1;
        return { keys: [{ ...publicJwk, kid: "key-01", alg: "RS256" }] };
      },
    });

    await expect(verifier.verifyAccessToken(signedToken(validPayload))).resolves.toMatchObject({
      subject: "doctor-01",
      role: "doctor",
      acr: "2",
    });
    await expect(verifier.verifyAccessToken(signedToken(validPayload))).resolves.toMatchObject({
      subject: "doctor-01",
    });
    expect(loadCount).toBe(1);
  });

  it.each([
    ["wrong issuer", { ...validPayload, iss: "https://other.example.test" }, "key-01"],
    ["wrong audience", { ...validPayload, aud: "other-api" }, "key-01"],
    ["expired", { ...validPayload, exp: Math.floor(now.getTime() / 1000) - 1 }, "key-01"],
    ["insufficient assurance", { ...validPayload, acr: "1" }, "key-01"],
    ["missing assurance", { ...validPayload, acr: undefined }, "key-01"],
    ["unknown key", validPayload, "unknown-key"],
  ])("rejects_%s", async (_label, payload, kid) => {
    const verifier = new OidcTokenVerifier({
      issuer: "https://identity.skinlab.test",
      audience: "skinlab-api",
      requiredAcr: "2",
      now: () => now,
      loadJwks: async () => ({ keys: [{ ...publicJwk, kid: "key-01", alg: "RS256" }] }),
    });

    await expect(verifier.verifyAccessToken(signedToken(payload, kid))).rejects.toBeInstanceOf(
      OidcTokenVerificationError,
    );
  });
});
