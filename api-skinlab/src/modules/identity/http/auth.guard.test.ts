import type { ExecutionContext } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { AuthGuard, AUTHENTICATED_USER } from "./auth.guard";

function contextWith(user?: { permission: "appointment:write" }) {
  return {
    getHandler: () => class Handler {},
    getClass: () => class Controller {},
    switchToHttp: () => ({
      getRequest: () => (user ? { [AUTHENTICATED_USER]: user } : {}),
    }),
  } as unknown as ExecutionContext;
}

describe("AuthGuard", () => {
  it("denies_a_protected_request_without_a_server_authenticated_user", () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(["appointment:write"]),
    };
    const guard = new AuthGuard(reflector as never);

    expect(guard.canActivate(contextWith())).toBe(false);
  });

  it("allows_only_the_permission_attached_by_the_server_authentication_adapter", () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(["appointment:write"]),
    };
    const guard = new AuthGuard(reflector as never);

    expect(
      guard.canActivate(contextWith({ permission: "appointment:write" })),
    ).toBe(true);
  });
});
