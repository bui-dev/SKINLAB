// @vitest-environment node

import { describe, expect, it } from "vitest";

import { buildLoginAuthorizationParameters } from "./oidc-bff-client";

describe("buildLoginAuthorizationParameters", () => {
  it("requires_authorization_code_pkce_nonce_and_acr_2", async () => {
    const parameters = await buildLoginAuthorizationParameters({
      redirectUri: "https://skinlab.test/api/auth/callback",
      state: "state-01",
      nonce: "nonce-01",
      codeVerifier: "pkce-verifier-01",
    });

    expect(parameters).toMatchObject({
      redirect_uri: "https://skinlab.test/api/auth/callback",
      response_type: "code",
      scope: "openid profile",
      state: "state-01",
      nonce: "nonce-01",
      code_challenge_method: "S256",
      acr_values: "2",
    });
    expect(JSON.parse(parameters.claims)).toEqual({
      id_token: { acr: { essential: true, values: ["2"] } },
    });
    expect(parameters.code_challenge).not.toBe("pkce-verifier-01");
  });
});
