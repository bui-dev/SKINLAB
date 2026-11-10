import { NextRequest, NextResponse } from "next/server";

import { loadWebServerEnv } from "@/config/env";
import {
  createInternalApiSessionClientFromEnv,
  decodeGatewayAssertionHeader,
} from "@/features/auth/server/api-session-client";
import { OidcBffClient } from "@/features/auth/server/oidc-bff-client";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return new NextResponse("Cross-origin refresh is denied.", { status: 403 });
  }
  const env = loadWebServerEnv(process.env);
  const sessionId = request.cookies.get(env.SESSION_COOKIE_NAME)?.value;
  if (!sessionId)
    return new NextResponse("No active session.", { status: 401 });
  const encodedAssertion = request.headers.get("x-skinlab-gateway-assertion");
  if (!encodedAssertion) {
    return new NextResponse("The refresh access context is invalid.", {
      status: 403,
    });
  }

  try {
    const api = createInternalApiSessionClientFromEnv(env);
    const { refreshToken: previousRefreshToken } = await api.post<{
      refreshToken: string;
    }>("/internal/sessions/refresh-token/read", { sessionId });
    const tokens = await new OidcBffClient(env).refreshSession(
      previousRefreshToken,
    );
    const session = await api.post<{ expiresAt: string }>(
      "/internal/sessions/refresh",
      {
        sessionId,
        previousRefreshToken,
        nextRefreshToken: tokens.refreshToken,
        accessToken: tokens.accessToken,
        gatewayAssertion: decodeGatewayAssertionHeader(encodedAssertion),
      },
    );
    return NextResponse.json({ expiresAt: session.expiresAt });
  } catch {
    return new NextResponse("Session refresh failed.", { status: 401 });
  }
}
