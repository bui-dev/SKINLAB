import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { request as httpsRequest } from "node:https";

import type { WebServerEnv } from "@/config/env";

export type Role = "doctor" | "receptionist" | "admin";
export type AccessContextKind = "clinic" | "remote";

export type SessionInfo = {
  subject: string;
  role: Role;
  accessContext: AccessContextKind;
  expiresAt: string;
};

export type CreateSessionInput = {
  accessToken: string;
  refreshToken: string;
  gatewayAssertion: unknown;
};

export type RefreshSessionInput = {
  sessionId: string;
  previousRefreshToken: string;
  nextRefreshToken: string;
  accessToken: string;
  gatewayAssertion: unknown;
};

export type CreateBffExchangeHeadersInput = {
  key: string;
  method: string;
  target: string;
  body: string;
  issuedAt: Date;
  nonce: string;
};

export function createBffExchangeHeaders(
  input: CreateBffExchangeHeadersInput,
): Record<string, string> {
  const issuedAt = input.issuedAt.toISOString();
  const bodyHash = createHash("sha256").update(input.body).digest("hex");
  const canonical = [
    input.method,
    input.target,
    bodyHash,
    issuedAt,
    input.nonce,
  ].join("\n");

  return {
    "x-skinlab-issued-at": issuedAt,
    "x-skinlab-nonce": input.nonce,
    "x-skinlab-signature": createHmac(
      "sha256",
      Buffer.from(input.key, "base64"),
    )
      .update(canonical)
      .digest("base64url"),
  };
}

type InternalApiSessionClientInput = {
  baseUrl: string;
  key: string;
  now: () => Date;
  createNonce: () => string;
  fetchImpl?: typeof fetch;
};

export class InternalApiSessionClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly input: InternalApiSessionClientInput) {
    this.fetchImpl = input.fetchImpl ?? fetch;
  }

  async post<TResponse>(
    path: string,
    payload: unknown,
    correlationId?: string,
  ): Promise<TResponse> {
    const body = JSON.stringify(payload);
    const headers = createBffExchangeHeaders({
      key: this.input.key,
      method: "POST",
      target: path,
      body,
      issuedAt: this.input.now(),
      nonce: this.input.createNonce(),
    });
    const correlationHeader = correlationId
      ? { "x-skinlab-correlation-id": correlationId }
      : { "x-skinlab-correlation-id": randomUUID() };
    const response = await this.fetchImpl(new URL(path, this.input.baseUrl), {
      method: "POST",
      body,
      headers: {
        "content-type": "application/json",
        ...headers,
        ...correlationHeader,
      },
    });
    if (!response.ok) {
      throw new Error("The internal API session request failed.");
    }

    return (await response.json()) as TResponse;
  }

  async createSession(
    input: CreateSessionInput,
    correlationId?: string,
  ): Promise<{ sessionId: string; expiresAt: string }> {
    return this.post<{ sessionId: string; expiresAt: string }>(
      "/internal/sessions",
      input,
      correlationId,
    );
  }

  async getSession(
    sessionId: string,
    correlationId?: string,
  ): Promise<SessionInfo | null> {
    return this.post<SessionInfo | null>(
      "/internal/sessions/read",
      { sessionId },
      correlationId,
    );
  }

  async getRefreshToken(
    sessionId: string,
    correlationId?: string,
  ): Promise<{ refreshToken: string }> {
    return this.post<{ refreshToken: string }>(
      "/internal/sessions/refresh-token/read",
      { sessionId },
      correlationId,
    );
  }

  async refreshSession(
    input: RefreshSessionInput,
    correlationId?: string,
  ): Promise<{ expiresAt: string }> {
    return this.post<{ expiresAt: string }>(
      "/internal/sessions/refresh",
      input,
      correlationId,
    );
  }

  async revokeSession(
    sessionId: string,
    correlationId?: string,
  ): Promise<{ revoked: true }> {
    return this.post<{ revoked: true }>(
      "/internal/sessions/revoke",
      { sessionId },
      correlationId,
    );
  }
}

export function decodeGatewayAssertionHeader(value: string): unknown {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new Error("The gateway assertion header is invalid.");
  }
}

export function createInternalApiSessionClient(
  input: Omit<InternalApiSessionClientInput, "createNonce">,
): InternalApiSessionClient {
  return new InternalApiSessionClient({ ...input, createNonce: randomUUID });
}

export function createInternalApiSessionClientFromEnv(
  env: WebServerEnv,
): InternalApiSessionClient {
  return createInternalApiSessionClient({
    baseUrl: env.API_INTERNAL_BASE_URL,
    key: env.BFF_EXCHANGE_HMAC_KEY,
    now: () => new Date(),
    fetchImpl: createMutualTlsFetch(env),
  });
}

function createMutualTlsFetch(env: WebServerEnv): typeof fetch {
  const cert = readFileSync(env.INTERNAL_TLS_CLIENT_CERT_PATH);
  const key = readFileSync(env.INTERNAL_TLS_CLIENT_KEY_PATH);
  const ca = readFileSync(env.INTERNAL_TLS_SERVER_CA_PATH);
  return async (input, init) => {
    const url = new URL(input.toString());
    const headers = new Headers(init?.headers);
    const body = typeof init?.body === "string" ? init.body : undefined;
    return new Promise<Response>((resolve, reject) => {
      const request = httpsRequest(
        url,
        {
          method: init?.method,
          headers: Object.fromEntries(headers.entries()),
          cert,
          key,
          ca,
          rejectUnauthorized: true,
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => {
            resolve(
              new Response(Buffer.concat(chunks), {
                status: response.statusCode,
                headers: response.headers as HeadersInit,
              }),
            );
          });
        },
      );
      request.on("error", reject);
      if (body) request.write(body);
      request.end();
    });
  };
}
