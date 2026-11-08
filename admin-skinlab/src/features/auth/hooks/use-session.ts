import type { Session } from "@/features/auth/types/session";

export type SessionState = {
  session: Session | null;
  status: "authenticated" | "unauthenticated" | "loading";
};

/** Client-consumable stub. Replace it when a real session source exists. */
export function useSession(): SessionState {
  return { session: null, status: "unauthenticated" };
}
