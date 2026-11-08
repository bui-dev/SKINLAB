import type { Session } from "@/features/auth/types/session";

/** Replace this stub with the server-side adapter for the chosen auth vendor. */
export async function getSession(): Promise<Session | null> {
  return Promise.resolve(null);
}
