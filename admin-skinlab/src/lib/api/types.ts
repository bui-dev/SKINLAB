import type { QueryValue } from "@/lib/utils";

export type ApiQuery = Readonly<Record<string, QueryValue>>;

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  baseUrl?: string;
  body?: unknown;
  query?: ApiQuery;
  timeoutMs?: number;
};
