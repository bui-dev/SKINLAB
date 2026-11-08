import { z } from "zod";

export const serverEnvSchema = z.object({
  API_BASE_URL: z.url(),
});

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

let serverEnv: ServerEnv | undefined;
let clientEnv: ClientEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "Server environment variables cannot be read in the browser.",
    );
  }

  serverEnv ??= serverEnvSchema.parse({
    API_BASE_URL: process.env.API_BASE_URL,
  });

  return serverEnv;
}

export function getClientEnv(): ClientEnv {
  clientEnv ??= clientEnvSchema.parse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });

  return clientEnv;
}

export function getApiBaseUrl(): string {
  return typeof window === "undefined"
    ? getServerEnv().API_BASE_URL
    : getClientEnv().NEXT_PUBLIC_API_BASE_URL;
}
