import type { ID } from "@/types";

export type User = {
  id: ID;
  displayName: string;
  email?: string;
};

export type Session = {
  user: User;
  expiresAt: string;
};
