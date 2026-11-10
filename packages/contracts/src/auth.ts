export const roles = ["doctor", "receptionist", "admin"] as const;
export type Role = (typeof roles)[number];

export const permissions = [
  "appointment:write",
  "clinical-record:read",
  "user:manage",
] as const;
export type Permission = (typeof permissions)[number];

export type AccessContextKind = "clinic" | "remote";
