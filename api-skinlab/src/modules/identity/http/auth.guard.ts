import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { AuthenticatedUser } from "../domain/authenticated-user";

import { REQUIRED_PERMISSIONS } from "./require-permission.decorator";

export const AUTHENTICATED_USER = "skinlabAuthenticatedUser";

type RequestWithAuthenticatedUser = {
  [AUTHENTICATED_USER]?: AuthenticatedUser;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      readonly string[]
    >(REQUIRED_PERMISSIONS, [context.getHandler(), context.getClass()]);
    if (!requiredPermissions?.length) return true;

    const request = context
      .switchToHttp()
      .getRequest<RequestWithAuthenticatedUser>();
    const user = request[AUTHENTICATED_USER];
    return !!user && requiredPermissions.includes(user.permission);
  }
}
