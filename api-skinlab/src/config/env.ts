import { isAbsolute } from "node:path";

import { z } from "zod";

const absolutePath = z.string().min(1).refine(isAbsolute, {
  message: "Secret file paths must be absolute.",
});

const keyWith32DecodedBytes = z
  .string()
  .regex(/^[A-Za-z0-9+/]{43}=$/, "Expected standard base64 encoding.")
  .refine((value) => Buffer.from(value, "base64").byteLength === 32, {
    message: "Key must decode to exactly 32 bytes.",
  });

export const apiEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().max(65_535).default(3001),
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      { message: "DATABASE_URL must use PostgreSQL." },
    ),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  CLINIC_TIMEZONE: z.literal("Asia/Ho_Chi_Minh"),
  OIDC_ISSUER: z.string().url(),
  OIDC_AUDIENCE: z.string().min(1),
  OIDC_REQUIRED_ACR: z.coerce.number().int().min(2).max(2),
  TOKEN_ENCRYPTION_KEY: keyWith32DecodedBytes,
  BFF_EXCHANGE_HMAC_KEY: keyWith32DecodedBytes,
  INTERNAL_TLS_CERT_PATH: absolutePath,
  INTERNAL_TLS_KEY_PATH: absolutePath,
  INTERNAL_TLS_CLIENT_CA_PATH: absolutePath,
  GATEWAY_CLIENT_CERT_FINGERPRINT: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/, "Expected a SHA-256 certificate fingerprint."),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function loadEnv(input: NodeJS.ProcessEnv): ApiEnv {
  return apiEnvSchema.parse(input);
}
