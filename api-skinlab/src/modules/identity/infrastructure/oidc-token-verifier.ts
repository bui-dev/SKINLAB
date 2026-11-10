import { createPublicKey, verify } from "node:crypto";

import { roles, type Role } from "@skinlab/contracts";

import type { VerifiedIdentity } from "../domain/authenticated-user";

export type JsonWebKey = {
  kty: string;
  n?: string;
  e?: string;
  kid?: string;
  alg?: string;
};

export type Jwks = { keys: JsonWebKey[] };

type OidcTokenVerifierInput = {
  issuer: string;
  audience: string;
  requiredAcr: "2";
  now: () => Date;
  loadJwks: () => Promise<Jwks>;
};

type TokenHeader = { alg?: string; kid?: string };
type TokenPayload = {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  role?: string;
  acr?: string;
  exp?: number;
};

export class OidcTokenVerificationError extends Error {}

export class OidcTokenVerifier {
  private cachedJwks: Jwks | null = null;

  constructor(private readonly input: OidcTokenVerifierInput) {}

  async verifyAccessToken(token: string): Promise<VerifiedIdentity> {
    const [encodedHeader, encodedPayload, encodedSignature, ...rest] =
      token.split(".");
    if (
      !encodedHeader ||
      !encodedPayload ||
      !encodedSignature ||
      rest.length > 0
    ) {
      throw new OidcTokenVerificationError("The access token is malformed.");
    }

    const header = this.decodeJson<TokenHeader>(encodedHeader);
    const payload = this.decodeJson<TokenPayload>(encodedPayload);
    if (header.alg !== "RS256" || !header.kid) {
      throw new OidcTokenVerificationError(
        "The access token algorithm is invalid.",
      );
    }

    const key = await this.findKey(header.kid);
    const signatureIsValid = verify(
      "RSA-SHA256",
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      createPublicKey({ key, format: "jwk" }),
      Buffer.from(encodedSignature, "base64url"),
    );
    if (!signatureIsValid) {
      throw new OidcTokenVerificationError(
        "The access token signature is invalid.",
      );
    }

    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    const role = payload.role;
    const nowSeconds = Math.floor(this.input.now().getTime() / 1000);
    if (
      payload.iss !== this.input.issuer ||
      !audience.includes(this.input.audience) ||
      !payload.sub ||
      !payload.exp ||
      payload.exp <= nowSeconds ||
      payload.acr !== this.input.requiredAcr ||
      !role ||
      !roles.includes(role as Role)
    ) {
      throw new OidcTokenVerificationError(
        "The access token claims are invalid.",
      );
    }

    return {
      issuer: payload.iss,
      audience: this.input.audience,
      subject: payload.sub,
      role: role as Role,
      acr: payload.acr,
      expiresAt: new Date(payload.exp * 1000),
      isEnabled: true,
    };
  }

  private decodeJson<T>(encoded: string): T {
    try {
      return JSON.parse(
        Buffer.from(encoded, "base64url").toString("utf8"),
      ) as T;
    } catch {
      throw new OidcTokenVerificationError("The access token is malformed.");
    }
  }

  private async findKey(kid: string): Promise<JsonWebKey> {
    const cached = this.cachedJwks ?? (await this.refreshJwks());
    const cachedKey = cached.keys.find((key) => key.kid === kid);
    if (cachedKey) {
      return cachedKey;
    }

    const refreshedKey = (await this.refreshJwks()).keys.find(
      (key) => key.kid === kid,
    );
    if (!refreshedKey) {
      throw new OidcTokenVerificationError("The signing key is unknown.");
    }

    return refreshedKey;
  }

  private async refreshJwks(): Promise<Jwks> {
    this.cachedJwks = await this.input.loadJwks();
    return this.cachedJwks;
  }
}
