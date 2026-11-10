import { SetMetadata } from "@nestjs/common";

import type { Permission } from "@skinlab/contracts";

export const REQUIRED_PERMISSIONS = Symbol("REQUIRED_PERMISSIONS");

export function RequirePermission(...permissions: Permission[]) {
  return SetMetadata(REQUIRED_PERMISSIONS, permissions);
}
