# Task 4A context signer

This is a deliberately small, internal-only Node.js service. Caddy calls `GET /sign` only after validating the browser's client certificate. The signer accepts the Caddy-created device fingerprint, access context, original method, and original path, then returns a one-time, 60-second assertion in `X-SkinLab-Gateway-Assertion`.

The service accepts only `GET /api/auth/callback`. That is the browser request that began the OIDC callback. The BFF separately signs its later `POST /internal/sessions` request to the API with the BFF exchange key. The two proofs deliberately bind to two different hops.

Run it only behind Caddy on a private Docker network. It requires mTLS from
Caddy before it will accept `/sign`; do not publish its port to the host. It
reads `GATEWAY_ASSERTION_HMAC_KEY_FILE`, `GATEWAY_SIGNER_TLS_CERT_PATH`,
`GATEWAY_SIGNER_TLS_KEY_PATH`, and `GATEWAY_SIGNER_CLIENT_CA_PATH`. The first
file must contain exactly one base64-encoded 32-byte key. Do not give that key
to the BFF, browser, repository, or logs.

For the local synthetic harness:

```sh
GATEWAY_ASSERTION_HMAC_KEY_FILE=/run/secrets/gateway-assertion.key \
GATEWAY_SIGNER_TLS_CERT_PATH=/run/secrets/context-signer-server-cert.pem \
GATEWAY_SIGNER_TLS_KEY_PATH=/run/secrets/context-signer-server-key.pem \
GATEWAY_SIGNER_CLIENT_CA_PATH=/run/secrets/caddy-signer-client-ca.pem \
node sign-assertion.mjs
```

This contract is not a production deployment recipe. Task 8 will provision real network isolation, certificates, secrets, and gateway runtime monitoring.
