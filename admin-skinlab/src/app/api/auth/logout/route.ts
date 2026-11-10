import { NextRequest, NextResponse } from "next/server";

import { loadWebServerEnv } from "@/config/env";
import { createInternalApiSessionClientFromEnv } from "@/features/auth/server/api-session-client";
import { clearSessionCookie } from "@/features/auth/server/session-cookie";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return new NextResponse("Cross-origin logout is denied.", { status: 403 });
  }
  const env = loadWebServerEnv(process.env);
  const sessionId = request.cookies.get(env.SESSION_COOKIE_NAME)?.value;
  if (sessionId) {
    const api = createInternalApiSessionClientFromEnv(env);
    try {
      await api.post("/internal/sessions/revoke", { sessionId });
    } catch {
      return new NextResponse("Logout could not be completed.", {
        status: 503,
      });
    }
  }
  const response = NextResponse.json({ loggedOut: true });
  const cookie = clearSessionCookie(env.SESSION_COOKIE_NAME);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
