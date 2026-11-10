import { createHash } from "node:crypto";

import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  discovery,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
  refreshTokenGrant,
  type Configuration,
} from "openid-client";

import type { WebServerEnv } from "@/config/env";

export type BuildLoginAuthorizationParametersInput = {
  redirectUri: string;
  state: string;
  nonce: string;
  codeVerifier: string;
};

export async function buildLoginAuthorizationParameters(
  input: BuildLoginAuthorizationParametersInput,
): Promise<Record<string, string>> {
  return {
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: "openid profile",
    state: input.state,
    nonce: input.nonce,
    code_challenge: await calculatePKCECodeChallenge(input.codeVerifier),
    code_challenge_method: "S256",
    acr_values: "2",
    claims: JSON.stringify({
      id_token: { acr: { essential: true, values: ["2"] } },
    }),
  };
}

export type OidcLoginStart = {
  state: string;
  nonce: string;
  codeVerifier: string;
  authorizationUrl: URL;
};

export type OidcCallbackResult = {
  subject: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export type OidcRefreshResult = Omit<OidcCallbackResult, "subject">;

export class OidcBffClient {
  private configuration: Promise<Configuration> | undefined;

  constructor(private readonly env: WebServerEnv) {}

  async startLogin(): Promise<OidcLoginStart> {
    const state = randomState();
    const nonce = randomNonce();
    const codeVerifier = randomPKCECodeVerifier();
    const parameters = await buildLoginAuthorizationParameters({
      redirectUri: this.env.OIDC_REDIRECT_URI,
      state,
      nonce,
      codeVerifier,
    });

    return {
      state,
      nonce,
      codeVerifier,
      authorizationUrl: buildAuthorizationUrl(
        await this.getConfiguration(),
        parameters,
      ),
    };
  }

  async exchangeCallback(input: {
    callbackUrl: URL;
    returnedState: string;
    nonceHash: string;
    codeVerifier: string;
  }): Promise<OidcCallbackResult> {
    const tokens = await authorizationCodeGrant(
      await this.getConfiguration(),
      input.callbackUrl,
      {
        expectedState: input.returnedState,
        pkceCodeVerifier: input.codeVerifier,
        idTokenExpected: true,
      },
    );
    const claims = tokens.claims();
    const nonce = typeof claims?.nonce === "string" ? claims.nonce : undefined;
    const subject = typeof claims?.sub === "string" ? claims.sub : undefined;
    if (
      !nonce ||
      !subject ||
      claims?.acr !== "2" ||
      hashOpaqueValue(nonce) !== input.nonceHash ||
      !tokens.access_token ||
      !tokens.refresh_token
    ) {
      throw new Error("The OIDC callback is invalid.");
    }

    return {
      subject,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(
        Date.now() + Math.max(tokens.expires_in ?? 0, 1) * 1000,
      ),
    };
  }

  async refreshSession(refreshToken: string): Promise<OidcRefreshResult> {
    const tokens = await refreshTokenGrant(
      await this.getConfiguration(),
      refreshToken,
    );
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("The OIDC refresh response is invalid.");
    }
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(
        Date.now() + Math.max(tokens.expires_in ?? 0, 1) * 1000,
      ),
    };
  }

  private getConfiguration(): Promise<Configuration> {
    this.configuration ??= discovery(
      new URL(this.env.OIDC_ISSUER),
      this.env.OIDC_CLIENT_ID,
      this.env.OIDC_CLIENT_SECRET,
    );
    return this.configuration;
  }
}

function hashOpaqueValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
