import { NextResponse, type NextRequest } from "next/server";

const protectedPrefix = "/app";

export function proxy(request: NextRequest): NextResponse {
  if (
    request.nextUrl.pathname.startsWith(protectedPrefix) &&
    !request.cookies.get(process.env.SESSION_COOKIE_NAME ?? "skinlab_session")
  ) {
    return NextResponse.redirect(new URL("/api/auth/login", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*"] };
