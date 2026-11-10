import { z } from "zod";

const keyWith32DecodedBytes = z
  .string()
  .regex(/^[A-Za-z0-9+/]{43}=$/, "Expected standard base64 encoding.")
  .refine((value) => Buffer.from(value, "base64").byteLength === 32, {
    message: "Key must decode to exactly 32 bytes.",
  });

export const webServerEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    OIDC_ISSUER: z.string().url(),
    OIDC_CLIENT_ID: z.string().min(1),
    OIDC_CLIENT_SECRET: z.string().min(1),
    OIDC_REDIRECT_URI: z.string().url(),
    OIDC_REQUIRED_ACR: z.coerce.number().int().min(2).max(2),
    API_INTERNAL_BASE_URL: z.string().url(),
    BFF_EXCHANGE_HMAC_KEY: keyWith32DecodedBytes,
    SESSION_COOKIE_NAME: z.string().min(1),
    LOGIN_ATTEMPT_COOKIE_NAME: z.string().min(1),
  })
  .superRefine((env, context) => {
    if (
      env.NODE_ENV !== "test" &&
      !env.OIDC_REDIRECT_URI.startsWith("https://")
    ) {
      context.addIssue({
        code: "custom",
        path: ["OIDC_REDIRECT_URI"],
        message: "OIDC_REDIRECT_URI must use HTTPS outside tests.",
      });
    }
  });

export const serverEnvSchema = z.object({
  API_BASE_URL: z.url(),
});

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type WebServerEnv = z.infer<typeof webServerEnvSchema>;

export function loadWebServerEnv(input: NodeJS.ProcessEnv): WebServerEnv {
  return webServerEnvSchema.parse(input);
}

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
