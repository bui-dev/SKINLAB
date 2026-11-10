import type { Permission } from "@skinlab/contracts";

import {
  AuthorizationError,
  authorizeRequest,
} from "../application/authorize-request";
import type {
  AccessContext,
  AuthenticatedUser,
} from "../domain/authenticated-user";
import type { UserSession } from "../domain/user-session";

import { AUTHENTICATED_USER } from "./auth.guard";

export class SessionAuthenticationAdapter {
  authenticate(
    session: UserSession,
    accessContext: AccessContext,
    permission: Permission,
    now: Date,
  ): AuthenticatedUser {
    if (
      session.deviceFingerprint !== accessContext.deviceFingerprint ||
      session.accessContext !== accessContext.kind
    ) {
      throw new AuthorizationError("The session access context changed.");
    }
    return authorizeRequest(
      {
        issuer: "session",
        audience: "skinlab-api",
        subject: session.subject,
        role: session.role,
        acr: session.acr,
        expiresAt: session.expiresAt,
        isEnabled: true,
      },
      accessContext,
      permission,
      now,
    );
  }

  attach(request: Record<string, unknown>, user: AuthenticatedUser): void {
    request[AUTHENTICATED_USER] = user;
  }
}
