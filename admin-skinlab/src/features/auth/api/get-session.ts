import { cookies } from "next/headers";

import { loadWebServerEnv } from "@/config/env";
import { createInternalApiSessionClientFromEnv } from "@/features/auth/server/api-session-client";
import type { Session } from "@/features/auth/types/session";

export async function getSession(): Promise<Session | null> {
  const env = loadWebServerEnv(process.env);
  const sessionId = (await cookies()).get(env.SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;
  const api = createInternalApiSessionClientFromEnv(env);
  const session = await api.post<{
    subject: string;
    role: string;
    accessContext: string;
    expiresAt: string;
  } | null>("/internal/sessions/read", { sessionId });
  if (!session) return null;
  return {
    user: { id: session.subject, displayName: session.subject },
    expiresAt: session.expiresAt,
  };
}
