import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const contextSignerDirectory = resolve(currentDirectory, "../context-signer");
const e2eSuffix = `${process.pid}-${Date.now()}`;

export async function runGatewayChain() {
  const workingDirectory = await mkdtemp(join(tmpdir(), "skinlab-gateway-e2e-"));
  const network = `skinlab-gateway-e2e-${e2eSuffix}`;
  const containers = [
    `skinlab-e2e-caddy-${e2eSuffix}`,
    `skinlab-e2e-bff-${e2eSuffix}`,
    `skinlab-e2e-api-${e2eSuffix}`,
    `skinlab-e2e-signer-${e2eSuffix}`,
  ];

  try {
    await createCertificates(workingDirectory);
    await createHarnessFiles(workingDirectory);
    await docker(["network", "create", network]);
    await startContainers({ workingDirectory, network, containers });

    const authorized = await retry(async () => {
      const result = await runBrowserClient(workingDirectory, network, "browser-client.mjs");
      return JSON.parse(result.stdout);
    });
    const withoutCertificate = JSON.parse(
      (await runBrowserClient(workingDirectory, network, "browser-without-client-cert.mjs"))
        .stdout,
    );
    const directSignerCall = JSON.parse(
      (await runBrowserClient(workingDirectory, network, "signer-without-caddy-cert.mjs"))
        .stdout,
    );
    const remoteAdmin = await retry(async () =>
      JSON.parse(
        (await runBrowserClient(workingDirectory, network, "remote-admin-client.mjs"))
          .stdout,
      ),
    );

    return {
      authorized,
      withoutClinicCertificateDenied: withoutCertificate.denied === true,
      directSignerCallDenied: directSignerCall.denied === true,
      remoteAdmin,
    };
  } catch (error) {
    const logs = await Promise.all(
      containers.map(async (container) => {
        const output = await docker(["logs", container]).catch(() => ({
          stdout: "",
          stderr: "",
        }));
        return `${container}: ${output.stdout}${output.stderr}`;
      }),
    );
    error.message = `${error.message}\n${logs.join("\n")}`;
    throw error;
  } finally {
    await Promise.all(
      containers.map((container) => docker(["rm", "--force", container]).catch(() => undefined)),
    );
    await docker(["network", "rm", network]).catch(() => undefined);
    await rm(workingDirectory, { recursive: true, force: true });
  }
}

async function startContainers({ workingDirectory, network, containers }) {
  const [caddy, bff, api, signer] = containers;
  const certificateVolume = `${workingDirectory}:/certs:ro`;
  const harnessVolume = `${workingDirectory}:/harness:ro`;

  await docker([
    "run",
    "--detach",
    "--name",
    signer,
    "--network",
    network,
    "--network-alias",
    "context-signer",
    "--volume",
    `${contextSignerDirectory}:/app:ro`,
    "--volume",
    certificateVolume,
    "--env",
    "GATEWAY_ASSERTION_HMAC_KEY_FILE=/certs/gateway-assertion.key",
    "--env",
    "GATEWAY_SIGNER_TLS_CERT_PATH=/certs/context-signer.crt",
    "--env",
    "GATEWAY_SIGNER_TLS_KEY_PATH=/certs/context-signer.key",
    "--env",
    "GATEWAY_SIGNER_CLIENT_CA_PATH=/certs/caddy-signer-client-ca.crt",
    "node:22-alpine",
    "node",
    "/app/sign-assertion.mjs",
  ]);
  await docker([
    "run",
    "--detach",
    "--name",
    api,
    "--network",
    network,
    "--network-alias",
    "api",
    "--volume",
    certificateVolume,
    "--volume",
    harnessVolume,
    "node:22-alpine",
    "node",
    "/harness/api-server.mjs",
  ]);
  await docker([
    "run",
    "--detach",
    "--name",
    bff,
    "--network",
    network,
    "--network-alias",
    "bff",
    "--volume",
    certificateVolume,
    "--volume",
    harnessVolume,
    "node:22-alpine",
    "node",
    "/harness/bff-server.mjs",
  ]);
  await docker([
    "run",
    "--detach",
    "--name",
    caddy,
    "--network",
    network,
    "--network-alias",
    "caddy",
    "--volume",
    certificateVolume,
    "--volume",
    `${workingDirectory}/Caddyfile:/etc/caddy/Caddyfile:ro`,
    "caddy:2.11-alpine",
    "caddy",
    "run",
    "--config",
    "/etc/caddy/Caddyfile",
    "--adapter",
    "caddyfile",
  ]);
}

async function runBrowserClient(workingDirectory, network, script) {
  return docker([
    "run",
    "--rm",
    "--network",
    network,
    "--volume",
    `${workingDirectory}:/certs:ro`,
    "--volume",
    `${workingDirectory}:/harness:ro`,
    "node:22-alpine",
    "node",
    `/harness/${script}`,
  ]);
}

async function retry(operation) {
  let lastError;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
    }
  }
  throw lastError;
}

async function createCertificates(directory) {
  await createCertificateAuthority(directory, "server-ca");
  await createCertificateAuthority(directory, "clinic-client-ca");
  await createCertificateAuthority(directory, "remote-admin-client-ca");
  await createCertificateAuthority(directory, "bff-client-ca");
  await createCertificateAuthority(directory, "api-client-ca");
  await createCertificateAuthority(directory, "caddy-signer-client-ca");
  await issueCertificate(directory, "caddy", "server-ca", ["caddy"]);
  await issueCertificate(directory, "context-signer", "server-ca", [
    "context-signer",
  ]);
  await issueCertificate(directory, "bff", "server-ca", ["bff"]);
  await issueCertificate(directory, "api", "server-ca", ["api"]);
  await issueCertificate(directory, "clinic-client", "clinic-client-ca");
  await issueCertificate(directory, "remote-admin-client", "remote-admin-client-ca");
  await issueCertificate(directory, "bff-client", "bff-client-ca");
  await issueCertificate(directory, "caddy-api-client", "api-client-ca");
  await issueCertificate(
    directory,
    "caddy-signer-client",
    "caddy-signer-client-ca",
  );
  await writeFile(
    join(directory, "gateway-assertion.key"),
    `${Buffer.alloc(32, 7).toString("base64")}\n`,
  );
}

async function createCertificateAuthority(directory, name) {
  await command("openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-days",
    "1",
    "-subj",
    `/CN=${name}`,
    "-keyout",
    join(directory, `${name}.key`),
    "-out",
    join(directory, `${name}.crt`),
  ]);
}

async function issueCertificate(directory, name, authority, subjectAlternativeNames = []) {
  const csr = join(directory, `${name}.csr`);
  await command("openssl", [
    "req",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-subj",
    `/CN=${name}`,
    "-keyout",
    join(directory, `${name}.key`),
    "-out",
    csr,
  ]);
  const extensionFile = join(directory, `${name}.ext`);
  if (subjectAlternativeNames.length > 0) {
    await writeFile(
      extensionFile,
      `[extensions]\nsubjectAltName=${subjectAlternativeNames.map((entry) => `DNS:${entry}`).join(",")}`,
    );
  }
  await command("openssl", [
    "x509",
    "-req",
    "-days",
    "1",
    "-in",
    csr,
    "-CA",
    join(directory, `${authority}.crt`),
    "-CAkey",
    join(directory, `${authority}.key`),
    "-CAcreateserial",
    "-out",
    join(directory, `${name}.crt`),
    ...(subjectAlternativeNames.length > 0
      ? ["-extfile", extensionFile, "-extensions", "extensions"]
      : []),
  ]);
}

async function createHarnessFiles(directory) {
  await writeFile(join(directory, "Caddyfile"), caddyfile());
  await writeFile(join(directory, "api-server.mjs"), apiServer());
  await writeFile(join(directory, "bff-server.mjs"), bffServer());
  await writeFile(join(directory, "browser-client.mjs"), browserClient(true));
  await writeFile(
    join(directory, "browser-without-client-cert.mjs"),
    browserClient(false),
  );
  await writeFile(
    join(directory, "signer-without-caddy-cert.mjs"),
    directSignerClient(),
  );
  await writeFile(join(directory, "remote-admin-client.mjs"), remoteAdminClient());
}

function caddyfile() {
  return `{
  admin off
  auto_https off
}

https://caddy:8443 {
  tls /certs/caddy.crt /certs/caddy.key {
    client_auth {
      mode require_and_verify
      trust_pool file /certs/clinic-client-ca.crt
    }
  }
  @callback path /api/auth/callback
  route @callback {
    request_header -X-SkinLab-Gateway-Assertion
    request_header -X-SkinLab-Verified-Device-Fingerprint
    request_header -X-SkinLab-Verified-Access-Context
    forward_auth https://context-signer:8443 {
      uri /sign
      transport http {
        tls
        tls_client_auth /certs/caddy-signer-client.crt /certs/caddy-signer-client.key
        tls_trust_pool file /certs/server-ca.crt
        tls_server_name context-signer
      }
      header_up X-SkinLab-Verified-Device-Fingerprint {tls_client_fingerprint}
      header_up X-SkinLab-Verified-Access-Context clinic
      header_up X-SkinLab-Original-Method {method}
      header_up X-SkinLab-Original-Path {path}
      copy_headers X-SkinLab-Gateway-Assertion
    }
    reverse_proxy https://bff:3000 {
      transport http {
        tls
        tls_trust_pool file /certs/server-ca.crt
        tls_server_name bff
      }
    }
  }
}

https://caddy:8444 {
  tls /certs/caddy.crt /certs/caddy.key {
    client_auth {
      mode require_and_verify
      trust_pool file /certs/remote-admin-client-ca.crt
    }
  }
  @callback path /api/auth/callback
  route @callback {
    request_header -X-SkinLab-Gateway-Assertion
    forward_auth https://context-signer:8443 {
      uri /sign
      transport http {
        tls
        tls_client_auth /certs/caddy-signer-client.crt /certs/caddy-signer-client.key
        tls_trust_pool file /certs/server-ca.crt
        tls_server_name context-signer
      }
      header_up X-SkinLab-Verified-Device-Fingerprint {tls_client_fingerprint}
      header_up X-SkinLab-Verified-Access-Context remote
      header_up X-SkinLab-Original-Method {method}
      header_up X-SkinLab-Original-Path {path}
      copy_headers X-SkinLab-Gateway-Assertion
    }
    reverse_proxy https://bff:3000 {
      transport http {
        tls
        tls_trust_pool file /certs/server-ca.crt
        tls_server_name bff
      }
    }
  }
  reverse_proxy https://bff:3000 {
    transport http {
      tls
      tls_trust_pool file /certs/server-ca.crt
      tls_server_name bff
    }
  }
}

https://caddy:9443 {
  tls /certs/caddy.crt /certs/caddy.key {
    client_auth {
      mode require_and_verify
      trust_pool file /certs/bff-client-ca.crt
    }
  }
  @internal path /internal/verify
  handle @internal {
    reverse_proxy https://api:3001 {
      transport http {
        tls
        tls_client_auth /certs/caddy-api-client.crt /certs/caddy-api-client.key
        tls_trust_pool file /certs/server-ca.crt
        tls_server_name api
      }
    }
  }
  respond "Not found" 404
}
`;
}

function apiServer() {
  return `import { readFileSync } from "node:fs";
import { createServer } from "node:https";

createServer({
  key: readFileSync("/certs/api.key"),
  cert: readFileSync("/certs/api.crt"),
  ca: readFileSync("/certs/api-client-ca.crt"),
  requestCert: true,
  rejectUnauthorized: true,
}, (request, response) => {
  const certificate = request.socket.getPeerCertificate();
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({
    status: "ok",
    gatewayAssertionReceived: typeof request.headers["x-skinlab-gateway-assertion"] === "string",
    caddyClientCertificateReceived: Boolean(certificate.fingerprint256),
  }));
}).listen(3001, "0.0.0.0");
`;
}

function bffServer() {
  return `import { readFileSync } from "node:fs";
import { request as httpsRequest, createServer } from "node:https";

const options = {
  key: readFileSync("/certs/bff.key"),
  cert: readFileSync("/certs/bff.crt"),
};
createServer(options, (request, response) => {
  if (request.url === "/api/auth/session") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ session: "reachable" }));
    return;
  }
  const assertion = request.headers["x-skinlab-gateway-assertion"];
  if (typeof assertion !== "string") {
    response.writeHead(403).end();
    return;
  }
  const upstream = httpsRequest({
    hostname: "caddy",
    port: 9443,
    path: "/internal/verify",
    method: "POST",
    key: readFileSync("/certs/bff-client.key"),
    cert: readFileSync("/certs/bff-client.crt"),
    ca: readFileSync("/certs/server-ca.crt"),
    servername: "caddy",
    headers: { "x-skinlab-gateway-assertion": assertion },
  }, (upstreamResponse) => {
    const chunks = [];
    upstreamResponse.on("data", (chunk) => chunks.push(chunk));
    upstreamResponse.on("end", () => {
      response.writeHead(upstreamResponse.statusCode ?? 502, { "content-type": "application/json" });
      response.end(Buffer.concat(chunks));
    });
  });
  upstream.on("error", () => response.writeHead(502).end());
  upstream.end();
}).listen(3000, "0.0.0.0");
`;
}

function browserClient(withClientCertificate) {
  const clientOptions = withClientCertificate
    ? `key: readFileSync("/certs/clinic-client.key"),\n  cert: readFileSync("/certs/clinic-client.crt"),`
    : "";
  return `import { readFileSync } from "node:fs";
import { request } from "node:https";

const upstream = request({
  hostname: "caddy",
  port: 8443,
  path: "/api/auth/callback",
  method: "GET",
  servername: "caddy",
  ca: readFileSync("/certs/server-ca.crt"),
  ${clientOptions}
}, (response) => {
  const chunks = [];
  response.on("data", (chunk) => chunks.push(chunk));
  response.on("end", () => {
    if (${withClientCertificate}) {
      process.stdout.write(Buffer.concat(chunks));
    } else {
      process.stdout.write(JSON.stringify({ denied: response.statusCode >= 400 }));
    }
  });
});
upstream.on("error", () => process.stdout.write(JSON.stringify({ denied: true })));
upstream.end();
`;
}

function directSignerClient() {
  return `import { readFileSync } from "node:fs";
import { request } from "node:https";

const upstream = request({
  hostname: "context-signer",
  port: 8443,
  path: "/sign",
  method: "GET",
  servername: "context-signer",
  ca: readFileSync("/certs/server-ca.crt"),
}, (response) => {
  process.stdout.write(JSON.stringify({ denied: response.statusCode >= 400 }));
});
upstream.on("error", () => process.stdout.write(JSON.stringify({ denied: true })));
upstream.end();
`;
}

function remoteAdminClient() {
  return `import { readFileSync } from "node:fs";
import { request } from "node:https";
const options = { hostname: "caddy", port: 8444, servername: "caddy", ca: readFileSync("/certs/server-ca.crt"), key: readFileSync("/certs/remote-admin-client.key"), cert: readFileSync("/certs/remote-admin-client.crt") };
const call = (path) => new Promise((resolve, reject) => { const r = request({ ...options, path, method: "GET" }, (response) => { const chunks=[]; response.on("data", (chunk) => chunks.push(chunk)); response.on("end", () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString("utf8") })); }); r.on("error", reject); r.end(); });
const callback = await call("/api/auth/callback");
const session = await call("/api/auth/session");
process.stdout.write(JSON.stringify({ callback: callback.status === 200, session: session.status === 200 }));
`;
}

function docker(argumentsList) {
  return command("docker", argumentsList);
}

function command(commandName, argumentsList) {
  return execFileAsync(commandName, argumentsList, {
    maxBuffer: 1_000_000,
  });
}
