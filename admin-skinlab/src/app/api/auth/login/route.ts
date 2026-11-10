import { NextResponse } from "next/server";

import { loadWebServerEnv } from "@/config/env";
import { createInternalApiSessionClientFromEnv } from "@/features/auth/server/api-session-client";
import { OidcBffClient } from "@/features/auth/server/oidc-bff-client";
import { issueLoginAttemptCookie } from "@/features/auth/server/session-cookie";

export async function GET(): Promise<NextResponse> {
  const env = loadWebServerEnv(process.env);
  const oidc = new OidcBffClient(env);
  const login = await oidc.startLogin();
  const api = createInternalApiSessionClientFromEnv(env);
  const attempt = await api.post<{ attemptId: string }>(
    "/internal/login-attempts",
    {
      state: login.state,
      nonce: login.nonce,
      codeVerifier: login.codeVerifier,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    },
  );
  const response = NextResponse.redirect(login.authorizationUrl);
  const cookie = issueLoginAttemptCookie(
    attempt.attemptId,
    env.LOGIN_ATTEMPT_COOKIE_NAME,
  );
  response.cookies.set(cookie.name, cookie.value, cookie.options);

  return response;
}
