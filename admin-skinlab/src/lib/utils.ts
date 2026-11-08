import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number | boolean)[];

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function toSearchParams(
  values: Readonly<Record<string, QueryValue>>,
): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue;

    const items = Array.isArray(value) ? value : [value];
    for (const item of items) searchParams.append(key, String(item));
  }

  return searchParams;
}
