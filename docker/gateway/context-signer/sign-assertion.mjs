import { createHash, createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:https";

const fingerprintPattern = /^[a-f0-9]{64}$/;
const supportedContexts = new Set(["clinic", "remote"]);
const allowedRequests = new Set([
  "GET /api/auth/callback",
  "POST /api/auth/refresh",
]);
const emptyBodyHash = createHash("sha256").update("").digest("hex");

export class GatewaySignerInputError extends Error {}

export function readGatewayAssertionKey(keyPath) {
  const key = readFileSync(keyPath, "utf8").trim();
  if (
    !/^[A-Za-z0-9+/]{43}=$/.test(key) ||
    Buffer.from(key, "base64").byteLength !== 32
  ) {
    throw new GatewaySignerInputError("Gateway assertion key is invalid.");
  }
  return key;
}

export function createGatewayAssertionHeader(input, key, options = {}) {
  const now = options.now ?? new Date();
  const id = options.id ?? randomUUID();
  const payload = normalizeInput(input, now, id);
  const signature = sign(payload, key);

  return Buffer.from(JSON.stringify({ ...payload, signature })).toString(
    "base64url",
  );
}

function normalizeInput(input, now, id) {
  const deviceFingerprint = input.deviceFingerprint?.toLowerCase();
  if (
    !fingerprintPattern.test(deviceFingerprint ?? "") ||
    !supportedContexts.has(input.context) ||
    !allowedRequests.has(`${input.method} ${input.target}`) ||
    typeof id !== "string" ||
    id.length === 0
  ) {
    throw new GatewaySignerInputError("Gateway assertion input is invalid.");
  }

  return {
    id,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 60_000).toISOString(),
    method: input.method,
    target: input.target,
    bodyHash: emptyBodyHash,
    deviceFingerprint,
    context: input.context,
  };
}

function sign(payload, key) {
  return createHmac("sha256", Buffer.from(key, "base64"))
    .update(
      [
        payload.id,
        payload.issuedAt,
        payload.expiresAt,
        payload.method,
        payload.target,
        payload.bodyHash,
        payload.deviceFingerprint,
        payload.context,
      ].join("\n"),
    )
    .digest("base64url");
}

export function startContextSigner({
  keyPath,
  tls,
  port = 8443,
  host = "0.0.0.0",
}) {
  const key = readGatewayAssertionKey(keyPath);
  if (!tls?.certPath || !tls.keyPath || !tls.clientCaPath) {
    throw new GatewaySignerInputError("Mutual TLS configuration is required.");
  }
  return createServer(
    {
      cert: readFileSync(tls.certPath),
      key: readFileSync(tls.keyPath),
      ca: readFileSync(tls.clientCaPath),
      requestCert: true,
      rejectUnauthorized: true,
    },
    (request, response) => {
    if (request.method !== "GET" || request.url !== "/sign") {
      response.writeHead(404).end();
      return;
    }

    try {
      const assertion = createGatewayAssertionHeader(
        {
          deviceFingerprint:
            request.headers["x-skinlab-verified-device-fingerprint"],
          context: request.headers["x-skinlab-verified-access-context"],
          method: request.headers["x-skinlab-original-method"],
          target: request.headers["x-skinlab-original-path"],
        },
        key,
      );
      response
        .writeHead(204, { "X-SkinLab-Gateway-Assertion": assertion })
        .end();
    } catch (error) {
      const status = error instanceof GatewaySignerInputError ? 403 : 500;
      response.writeHead(status).end();
    }
    },
  ).listen(port, host);
}

if (import.meta.main) {
  const keyPath = process.env.GATEWAY_ASSERTION_HMAC_KEY_FILE;
  const tls = {
    certPath: process.env.GATEWAY_SIGNER_TLS_CERT_PATH,
    keyPath: process.env.GATEWAY_SIGNER_TLS_KEY_PATH,
    clientCaPath: process.env.GATEWAY_SIGNER_CLIENT_CA_PATH,
  };
  if (!keyPath)
    throw new GatewaySignerInputError(
      "GATEWAY_ASSERTION_HMAC_KEY_FILE is required.",
    );
  startContextSigner({ keyPath, tls, port: Number(process.env.PORT ?? 8443) });
}
