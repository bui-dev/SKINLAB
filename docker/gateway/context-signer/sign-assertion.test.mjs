import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  GatewaySignerInputError,
  createGatewayAssertionHeader,
  readGatewayAssertionKey,
  startContextSigner,
} from "./sign-assertion.mjs";

const now = new Date("2026-11-10T10:00:00.000Z");
const key = Buffer.alloc(32, 9).toString("base64");
const validInput = {
  deviceFingerprint:
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  context: "clinic",
  method: "GET",
  target: "/api/auth/callback",
};

test("signer returns a short-lived signed assertion without exposing its key", () => {
  const header = createGatewayAssertionHeader(validInput, key, {
    now,
    id: "assertion-01",
  });
  const decoded = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));

  assert.equal(decoded.context, "clinic");
  assert.equal(decoded.method, "GET");
  assert.equal(decoded.target, "/api/auth/callback");
  assert.equal(
    decoded.bodyHash,
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  );
  assert.equal(decoded.expiresAt, "2026-11-10T10:01:00.000Z");
  assert.ok(
    typeof decoded.signature === "string" && decoded.signature.length > 0,
  );
  assert.ok(!header.includes(key));
  assert.equal(Object.hasOwn(decoded, "key"), false);
});

test("signer rejects untrusted client evidence", () => {
  for (const input of [
    { ...validInput, deviceFingerprint: "not-a-fingerprint" },
    { ...validInput, context: "internet" },
    { ...validInput, method: "POST" },
    { ...validInput, target: "/not-an-auth-callback" },
  ]) {
    assert.throws(
      () =>
        createGatewayAssertionHeader(input, key, { now, id: "assertion-01" }),
      GatewaySignerInputError,
    );
  }
});

test("signer issues a request-bound assertion for an empty-body refresh", () => {
  const header = createGatewayAssertionHeader(
    {
      ...validInput,
      method: "POST",
      target: "/api/auth/refresh",
    },
    key,
    { now, id: "refresh-assertion-01" },
  );
  const decoded = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));

  assert.equal(decoded.method, "POST");
  assert.equal(decoded.target, "/api/auth/refresh");
});

test("signer reads only a valid 32-byte base64 secret file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "skinlab-context-signer-"));
  const keyPath = join(directory, "gateway-assertion.key");
  await writeFile(keyPath, `${key}\n`, "utf8");

  assert.equal(readGatewayAssertionKey(keyPath), key);
  await writeFile(keyPath, "not-a-key", "utf8");
  assert.throws(
    () => readGatewayAssertionKey(keyPath),
    GatewaySignerInputError,
  );
});

test("signer refuses to start without mutually authenticated TLS", async () => {
  const directory = await mkdtemp(join(tmpdir(), "skinlab-context-signer-"));
  const keyPath = join(directory, "gateway-assertion.key");
  await writeFile(keyPath, `${key}\n`, "utf8");

  let error;
  let server;
  try {
    server = startContextSigner({ keyPath, port: 0 });
  } catch (caught) {
    error = caught;
  } finally {
    server?.close();
  }
  assert.ok(error instanceof GatewaySignerInputError);
});
