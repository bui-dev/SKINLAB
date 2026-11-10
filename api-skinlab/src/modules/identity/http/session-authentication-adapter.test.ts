import { describe, expect, it } from "vitest";

import { AuthorizationError } from "../application/authorize-request";

import { AuthGuard } from "./auth.guard";
import { SessionAuthenticationAdapter } from "./session-authentication-adapter";

const now = new Date("2026-11-10T09:00:00.000Z");
const deviceFingerprint =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const session = {
  id: "opaque-session-id",
  subject: "receptionist-01",
  role: "receptionist" as const,
  acr: "2",
  deviceFingerprint,
  accessContext: "clinic" as const,
  expiresAt: new Date("2026-11-10T10:00:00.000Z"),
};
const accessContext = {
  kind: "clinic" as const,
  deviceFingerprint,
  deviceIsRegistered: true,
  deviceIsActive: true,
  assertionExpiresAt: new Date("2026-11-10T09:00:30.000Z"),
};

describe("SessionAuthenticationAdapter", () => {
  it("attaches_an_authorized_receptionist_to_a_server_request", () => {
    const request = {};
    const adapter = new SessionAuthenticationAdapter();

    const user = adapter.authenticate(
      session,
      accessContext,
      "appointment:write",
      now,
    );
    adapter.attach(request, user);

    expect(request).toMatchObject({
      skinlabAuthenticatedUser: {
        subject: "receptionist-01",
        permission: "appointment:write",
        accessContext: "clinic",
      },
    });
  });

  it("rejects_a_session_replayed_from_a_different_managed_device", () => {
    const adapter = new SessionAuthenticationAdapter();

    expect(() =>
      adapter.authenticate(
        session,
        {
          ...accessContext,
          deviceFingerprint:
            "1123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        },
        "appointment:write",
        now,
      ),
    ).toThrow(AuthorizationError);
  });

  it("feeds_the_attached_session_identity_into_the_permission_guard", () => {
    const request = {};
    const adapter = new SessionAuthenticationAdapter();
    adapter.attach(
      request,
      adapter.authenticate(session, accessContext, "appointment:write", now),
    );
    const guard = new AuthGuard({
      getAllAndOverride: () => ["appointment:write"],
    } as never);

    expect(
      guard.canActivate({
        getHandler: () => class Handler {},
        getClass: () => class Controller {},
        switchToHttp: () => ({ getRequest: () => request }),
      } as never),
    ).toBe(true);
  });
});
