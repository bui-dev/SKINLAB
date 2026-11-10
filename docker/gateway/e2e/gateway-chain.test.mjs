import assert from "node:assert/strict";
import test from "node:test";

import { runGatewayChain } from "./gateway-chain.mjs";

test("Caddy carries only mTLS-derived gateway evidence across BFF to API", {
  timeout: 90_000,
}, async () => {
  const result = await runGatewayChain();

  assert.deepEqual(result.authorized, {
    status: "ok",
    gatewayAssertionReceived: true,
    caddyClientCertificateReceived: true,
  });
  assert.equal(result.withoutClinicCertificateDenied, true);
  assert.equal(result.directSignerCallDenied, true);
  assert.deepEqual(result.remoteAdmin, { callback: true, session: true });
});
