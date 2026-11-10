import { useEffect, useState } from "react";

import type { Session } from "@/features/auth/types/session";

export type SessionState = {
  session: Session | null;
  status: "authenticated" | "unauthenticated" | "loading";
};

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({
    session: null,
    status: "loading",
  });
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/session", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session lookup failed.");
        return (await response.json()) as { session: Session | null };
      })
      .then(({ session }) => {
        if (!cancelled) {
          setState({
            session,
            status: session ? "authenticated" : "unauthenticated",
          });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ session: null, status: "unauthenticated" });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
