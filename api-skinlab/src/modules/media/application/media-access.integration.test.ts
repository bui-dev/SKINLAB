import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../identity/domain/authenticated-user";
import {
  FilePayloadTooLargeError,
  InvalidMimeTypeError,
  MediaSecurityViolationError,
  StoredObjectNotFoundError,
} from "../domain/stored-object";
import { S3ObjectStore } from "../infrastructure/s3-object-store";
import { CreateReadGrant } from "./create-read-grant";
import { StorePrivateObject } from "./store-private-object";

describe("Media Access Integration Tests", () => {
  let server: Server;
  let endpoint: string;
  let s3Store: S3ObjectStore;
  let storeService: StorePrivateObject;
  let readGrantService: CreateReadGrant;

  const inMemoryObjects = new Map<
    string,
    { body: Buffer; contentType: string }
  >();
  const auditLogsRecorded: Array<Record<string, unknown>> = [];

  const mockAuditRecordService = {
    record: vi.fn().mockImplementation((event) => {
      auditLogsRecorded.push(event);
      return Promise.resolve({ id: `audit-${auditLogsRecorded.length}` });
    }),
  };

  const doctorActor: AuthenticatedUser = {
    subject: "doctor-01",
    role: "doctor",
    permission: "clinical-record:read",
    accessContext: "clinic",
    deviceFingerprint: "sha256:cert-doc-01",
  };

  const receptionistActor: AuthenticatedUser = {
    subject: "staff-01",
    role: "receptionist",
    permission: "appointment:write",
    accessContext: "clinic",
    deviceFingerprint: "sha256:cert-rec-01",
  };

  beforeAll(async () => {
    // Spin up an in-process S3/MinIO compatible HTTP mock server
    server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const pathname = decodeURIComponent(url.pathname);
      const parts = pathname.replace(/^\//, "").split("/");
      const bucket = parts[0];
      const key = parts.slice(1).join("/");

      if (req.method === "PUT") {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
          const body = Buffer.concat(chunks);
          const contentType =
            req.headers["content-type"] ?? "application/octet-stream";
          inMemoryObjects.set(`${bucket}/${key}`, { body, contentType });
          res.writeHead(200, { "Content-Type": "application/xml" });
          res.end("<PutObjectResult/>");
        });
        return;
      }

      if (req.method === "HEAD") {
        const item = inMemoryObjects.get(`${bucket}/${key}`);
        if (!item) {
          res.writeHead(404);
          res.end();
          return;
        }
        res.writeHead(200, {
          "Content-Length": item.body.length.toString(),
          "Content-Type": item.contentType,
        });
        res.end();
        return;
      }

      if (req.method === "GET") {
        const sig = url.searchParams.get("X-Amz-Signature");
        const dateStr = url.searchParams.get("X-Amz-Date");
        const expiresStr = url.searchParams.get("X-Amz-Expires");

        // Reject anonymous unauthenticated requests
        if (!sig || !dateStr || !expiresStr) {
          res.writeHead(403, { "Content-Type": "application/xml" });
          res.end(
            "<Error><Code>AccessDenied</Code><Message>Anonymous access forbidden</Message></Error>",
          );
          return;
        }

        // Check expiration
        const amzDatePattern =
          /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/;
        const match = dateStr.match(amzDatePattern);
        if (match) {
          const reqTime = Date.UTC(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
            Number(match[4]),
            Number(match[5]),
            Number(match[6]),
          );
          const ttlMs = Number(expiresStr) * 1000;
          if (Date.now() > reqTime + ttlMs) {
            res.writeHead(403, { "Content-Type": "application/xml" });
            res.end(
              "<Error><Code>RequestTimeTooSkewed</Code><Message>Request has expired</Message></Error>",
            );
            return;
          }
        }

        const item = inMemoryObjects.get(`${bucket}/${key}`);
        if (!item) {
          res.writeHead(404);
          res.end();
          return;
        }

        res.writeHead(200, {
          "Content-Length": item.body.length.toString(),
          "Content-Type": item.contentType,
        });
        res.end(item.body);
        return;
      }

      res.writeHead(405);
      res.end();
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const addr = server.address() as AddressInfo;
        endpoint = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    s3Store = new S3ObjectStore({
      endpoint,
      region: "us-east-1",
      bucket: "skinlab-clinical-media",
      accessKey: "test-access-key",
      secretKey: "test-secret-key",
    });

    storeService = new StorePrivateObject(
      s3Store,
      mockAuditRecordService as never,
    );
    readGrantService = new CreateReadGrant(
      s3Store,
      mockAuditRecordService as never,
    );
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("Scenario 1: Permitted doctor stores clinical image and creates read grant", async () => {
    const rawImage = Buffer.from("simulated-high-res-clinical-jpeg-content");
    const stored = await storeService.execute(
      {
        content: rawImage,
        contentType: "image/jpeg",
        filename: "wound_day_1.jpg",
      },
      doctorActor,
    );

    expect(stored.id).toBeDefined();
    expect(stored.key).toMatch(/^clinical\/[0-9a-f-]+$/);
    expect(stored.sizeBytes).toBe(rawImage.length);

    // Doctor creates read grant
    const grant = await readGrantService.execute(stored.id, doctorActor, 300);
    expect(grant.url).toContain("X-Amz-Signature=");

    // Fetch through presigned URL
    const response = await fetch(grant.url);
    expect(response.status).toBe(200);
    const fetchedBytes = Buffer.from(await response.arrayBuffer());
    expect(fetchedBytes).toEqual(rawImage);

    // Verify audit logs
    const storeLog = auditLogsRecorded.find(
      (l) => l.action === "media.object.stored",
    );
    expect(storeLog).toBeDefined();
    expect(storeLog?.entityId).toBe(stored.id);

    const readLog = auditLogsRecorded.find(
      (l) => l.action === "media.object.read_granted",
    );
    expect(readLog).toBeDefined();
    expect(readLog?.entityId).toBe(stored.id);
  });

  it("Scenario 2: Receptionist is strictly forbidden from receiving read grant", async () => {
    await expect(
      readGrantService.execute("some-id", receptionistActor, 300),
    ).rejects.toThrow(MediaSecurityViolationError);
  });

  it("Scenario 3: Direct anonymous access to storage bucket is denied with 403", async () => {
    const directUrl = `${endpoint}/skinlab-clinical-media/clinical/secret-image`;
    const response = await fetch(directUrl);
    expect(response.status).toBe(403);
  });

  it("Scenario 4: Requesting expired URL returns 403 error", async () => {
    const rawImage = Buffer.from("expiring-photo-bytes");
    const stored = await storeService.execute(
      {
        content: rawImage,
        contentType: "image/png",
      },
      doctorActor,
    );

    // Expire after 1 second (ttl = 1 second)
    const grant = await readGrantService.execute(stored.id, doctorActor, 1);

    // Wait 1.1s to ensure expiration
    await new Promise((r) => setTimeout(r, 1100));

    const response = await fetch(grant.url);
    expect(response.status).toBe(403);
  });

  it("Scenario 5: Rejects unsupported MIME types with InvalidMimeTypeError", async () => {
    await expect(
      storeService.execute(
        {
          content: Buffer.from("malicious-script"),
          contentType: "application/x-msdownload",
        },
        doctorActor,
      ),
    ).rejects.toThrow(InvalidMimeTypeError);
  });

  it("Scenario 6: Rejects oversized files with FilePayloadTooLargeError", async () => {
    const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);
    await expect(
      storeService.execute(
        {
          content: oversizedBuffer,
          contentType: "image/jpeg",
        },
        doctorActor,
      ),
    ).rejects.toThrow(FilePayloadTooLargeError);
  });

  it("Scenario 7: Guessing nonexistent key throws StoredObjectNotFoundError", async () => {
    await expect(
      readGrantService.execute("guessed-uuid-9999", doctorActor, 300),
    ).rejects.toThrow(StoredObjectNotFoundError);
  });

  it("Scenario 8: Doctor accessing remotely is strictly forbidden with MediaSecurityViolationError", async () => {
    const remoteDoctorActor: AuthenticatedUser = {
      ...doctorActor,
      accessContext: "remote",
    };
    await expect(
      readGrantService.execute("any-object-id", remoteDoctorActor, 300),
    ).rejects.toThrow(MediaSecurityViolationError);
  });

  it("Scenario 9: Path traversal attempts in object key are rejected", async () => {
    await expect(
      readGrantService.execute("../../../etc/shadow", doctorActor, 300),
    ).rejects.toThrow(MediaSecurityViolationError);
    await expect(
      readGrantService.execute("clinical//double-slash", doctorActor, 300),
    ).rejects.toThrow(MediaSecurityViolationError);
  });
});

