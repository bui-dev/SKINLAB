import { ApiError } from "@/lib/api/api-error";

export type NormalizedError = {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
};

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
    };
  }

  if (error instanceof Error) return { message: error.message };

  return { message: "An unexpected error occurred." };
}
