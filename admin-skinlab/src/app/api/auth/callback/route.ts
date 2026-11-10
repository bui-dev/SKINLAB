import { NextRequest, NextResponse } from "next/server";

import { loadWebServerEnv } from "@/config/env";
import {
  createInternalApiSessionClientFromEnv,
  decodeGatewayAssertionHeader,
} from "@/features/auth/server/api-session-client";
import { OidcBffClient } from "@/features/auth/server/oidc-bff-client";
import {
  clearLoginAttemptCookie,
  issueSessionCookie,
} from "@/features/auth/server/session-cookie";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const env = loadWebServerEnv(process.env);
  const attemptId = request.cookies.get(env.LOGIN_ATTEMPT_COOKIE_NAME)?.value;
  const returnedState = request.nextUrl.searchParams.get("state");
  const encodedAssertion = request.headers.get("x-skinlab-gateway-assertion");
  if (!attemptId || !returnedState || !encodedAssertion) {
    return new NextResponse("The login callback is invalid.", { status: 400 });
  }

  try {
    const api = createInternalApiSessionClientFromEnv(env);
    const attempt = await api.post<{ nonceHash: string; codeVerifier: string }>(
      `/internal/login-attempts/${attemptId}/consume`,
      { returnedState },
    );
    const oidc = new OidcBffClient(env);
    const tokens = await oidc.exchangeCallback({
      callbackUrl: request.nextUrl,
      returnedState,
      nonceHash: attempt.nonceHash,
      codeVerifier: attempt.codeVerifier,
    });
    const session = await api.post<{ sessionId: string }>(
      "/internal/sessions",
      {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        gatewayAssertion: decodeGatewayAssertionHeader(encodedAssertion),
      },
    );
    const response = NextResponse.redirect(new URL("/", request.url));
    const loginCookie = clearLoginAttemptCookie(env.LOGIN_ATTEMPT_COOKIE_NAME);
    const sessionCookie = issueSessionCookie(
      session.sessionId,
      env.SESSION_COOKIE_NAME,
    );
    response.cookies.set(
      loginCookie.name,
      loginCookie.value,
      loginCookie.options,
    );
    response.cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.options,
    );
    return response;
  } catch {
    const response = new NextResponse("The login callback is invalid.", {
      status: 400,
    });
    const loginCookie = clearLoginAttemptCookie(env.LOGIN_ATTEMPT_COOKIE_NAME);
    response.cookies.set(
      loginCookie.name,
      loginCookie.value,
      loginCookie.options,
    );
    return response;
  }
}
