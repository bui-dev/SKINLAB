import { createSign, generateKeyPairSync } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export type Role = "doctor" | "receptionist" | "admin";

export type MockTokenInput = {
  sub: string;
  role: Role;
  email: string;
  acr?: string;
  aud?: string;
  expiresInSeconds?: number;
};

export class TestOidcIssuer {
  private server?: Server;
  private privateKey!: string;
  private publicKey!: string;
  private modulus!: string;
  private exponent!: string;
  public issuerUrl!: string;
  public jwksUrl!: string;

  constructor() {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    this.privateKey = privateKey.export({
      type: "pkcs8",
      format: "pem",
    }) as string;
    this.publicKey = publicKey.export({
      type: "spki",
      format: "pem",
    }) as string;
    const jwk = publicKey.export({ format: "jwk" });
    this.modulus = jwk.n!;
    this.exponent = jwk.e!;
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => {
        if (req.url === "/.well-known/openid-configuration") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              issuer: this.issuerUrl,
              jwks_uri: this.jwksUrl,
            }),
          );
          return;
        }
        if (req.url === "/protocol/openid-connect/certs") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(this.getJwks()));
          return;
        }
        res.writeHead(404).end();
      });

      this.server.listen(0, "127.0.0.1", () => {
        const addr = this.server?.address() as AddressInfo | null;
        const port = addr?.port ?? 8080;
        this.issuerUrl = `http://127.0.0.1:${port}`;
        this.jwksUrl = `${this.issuerUrl}/protocol/openid-connect/certs`;
        resolve();
      });
    });
  }

  getJwks(): {
    keys: Array<{
      kty: string;
      alg: string;
      use: string;
      kid: string;
      n: string;
      e: string;
    }>;
  } {
    return {
      keys: [
        {
          kty: "RSA",
          alg: "RS256",
          use: "sig",
          kid: "test-key-id",
          n: this.modulus,
          e: this.exponent,
        },
      ],
    };
  }

  createSignedToken(input: MockTokenInput): string {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT", kid: "test-key-id" };
    const payload = {
      sub: input.sub,
      email: input.email,
      role: input.role,
      acr: input.acr ?? "2",
      aud: input.aud ?? "skinlab-api",
      iss: this.issuerUrl,
      iat: nowSeconds,
      exp: nowSeconds + (input.expiresInSeconds ?? 3600),
    };

    const encHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
    const encPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signer = createSign("RSA-SHA256");
    signer.update(`${encHeader}.${encPayload}`);
    const signature = signer.sign(this.privateKey, "base64url");

    return `${encHeader}.${encPayload}.${signature}`;
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
