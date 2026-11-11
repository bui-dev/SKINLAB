import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../identity/domain/authenticated-user";
import {
  MediaSecurityViolationError,
  StoredObjectNotFoundError,
} from "../domain/stored-object";
import { CreateReadGrant, createReadGrant } from "./create-read-grant";

describe("CreateReadGrant unit tests", () => {
  const mockDoctor: AuthenticatedUser = {
    subject: "doc-1",
    role: "doctor",
    permission: "clinical-record:read",
    accessContext: "clinic",
    deviceFingerprint: "sha256:cert-fp-doc",
  };

  const mockReceptionist: AuthenticatedUser = {
    subject: "recep-1",
    role: "receptionist",
    permission: "appointment:write",
    accessContext: "clinic",
    deviceFingerprint: "sha256:cert-fp-rec",
  };

  const mockAdmin: AuthenticatedUser = {
    subject: "admin-1",
    role: "admin",
    permission: "user:manage",
    accessContext: "clinic",
    deviceFingerprint: "sha256:cert-fp-adm",
  };

  it("creates a presigned read grant for a permitted doctor", async () => {
    const mockS3 = {
      headObject: vi.fn().mockResolvedValue({ sizeBytes: 1024, contentType: "image/jpeg" }),
      getPresignedReadUrl: vi.fn().mockResolvedValue("https://s3.local/clinical-media/uuid?sig=xyz"),
    };
    const mockAudit = {
      record: vi.fn().mockResolvedValue({ id: "evt-read-1" }),
    };

    const service = new CreateReadGrant(mockS3 as never, mockAudit as never);
    const result = await service.execute("img-123", mockDoctor, 600);

    expect(result.url).toBe("https://s3.local/clinical-media/uuid?sig=xyz");
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(mockS3.headObject).toHaveBeenCalledWith("clinical/img-123");
    expect(mockS3.getPresignedReadUrl).toHaveBeenCalledWith("clinical/img-123", 600);

    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "media.object.read_granted",
        entityType: "stored_object",
        entityId: "img-123",
        actor: {
          subject: "doc-1",
          role: "doctor",
          accessContext: "clinic",
          deviceFingerprint: "sha256:cert-fp-doc",
        },
      }),
    );
  });

  it("strictly forbids receptionist from reading clinical images", async () => {
    const mockS3 = {
      headObject: vi.fn(),
      getPresignedReadUrl: vi.fn(),
    };
    const mockAudit = {
      record: vi.fn(),
    };

    const service = new CreateReadGrant(mockS3 as never, mockAudit as never);

    await expect(service.execute("img-123", mockReceptionist)).rejects.toThrow(
      MediaSecurityViolationError,
    );

    expect(mockS3.headObject).not.toHaveBeenCalled();
    expect(mockS3.getPresignedReadUrl).not.toHaveBeenCalled();
    expect(mockAudit.record).not.toHaveBeenCalled();
  });

  it("strictly forbids admin from reading clinical images", async () => {
    const mockS3 = {
      headObject: vi.fn(),
      getPresignedReadUrl: vi.fn(),
    };
    const mockAudit = {
      record: vi.fn(),
    };

    const service = new CreateReadGrant(mockS3 as never, mockAudit as never);

    await expect(service.execute("img-123", mockAdmin)).rejects.toThrow(
      MediaSecurityViolationError,
    );

    expect(mockS3.headObject).not.toHaveBeenCalled();
    expect(mockAudit.record).not.toHaveBeenCalled();
  });

  it("throws StoredObjectNotFoundError when object does not exist in S3", async () => {
    const mockS3 = {
      headObject: vi.fn().mockResolvedValue(null),
      getPresignedReadUrl: vi.fn(),
    };
    const mockAudit = {
      record: vi.fn(),
    };

    const service = new CreateReadGrant(mockS3 as never, mockAudit as never);

    await expect(service.execute("non-existent", mockDoctor)).rejects.toThrow(
      StoredObjectNotFoundError,
    );

    expect(mockS3.getPresignedReadUrl).not.toHaveBeenCalled();
    expect(mockAudit.record).not.toHaveBeenCalled();
  });

  it("strictly forbids doctor from reading clinical images remotely", async () => {
    const mockRemoteDoctor: AuthenticatedUser = {
      ...mockDoctor,
      accessContext: "remote",
    };
    const mockS3 = {
      headObject: vi.fn(),
      getPresignedReadUrl: vi.fn(),
    };
    const mockAudit = {
      record: vi.fn(),
    };

    const service = new CreateReadGrant(mockS3 as never, mockAudit as never);

    await expect(
      service.execute("img-123", mockRemoteDoctor),
    ).rejects.toThrow(MediaSecurityViolationError);

    expect(mockS3.headObject).not.toHaveBeenCalled();
    expect(mockAudit.record).not.toHaveBeenCalled();
  });

  it("rejects invalid TTL values outside 1-900 seconds", async () => {
    const mockS3 = {
      headObject: vi.fn().mockResolvedValue({ sizeBytes: 1024, contentType: "image/jpeg" }),
      getPresignedReadUrl: vi.fn(),
    };
    const mockAudit = {
      record: vi.fn(),
    };

    const service = new CreateReadGrant(mockS3 as never, mockAudit as never);

    await expect(service.execute("img-123", mockDoctor, 0)).rejects.toThrow(
      MediaSecurityViolationError,
    );
    await expect(service.execute("img-123", mockDoctor, -1)).rejects.toThrow(
      MediaSecurityViolationError,
    );
    await expect(service.execute("img-123", mockDoctor, 901)).rejects.toThrow(
      MediaSecurityViolationError,
    );

    expect(mockS3.headObject).not.toHaveBeenCalled();
  });

  it("rejects path traversal attempts in object key", async () => {
    const mockS3 = {
      headObject: vi.fn(),
      getPresignedReadUrl: vi.fn(),
    };
    const mockAudit = {
      record: vi.fn(),
    };

    const service = new CreateReadGrant(mockS3 as never, mockAudit as never);

    await expect(
      service.execute("../../../etc/passwd", mockDoctor),
    ).rejects.toThrow(MediaSecurityViolationError);
    await expect(
      service.execute("clinical//sensitive-file", mockDoctor),
    ).rejects.toThrow(MediaSecurityViolationError);
    await expect(
      service.execute("clinical/", mockDoctor),
    ).rejects.toThrow(MediaSecurityViolationError);

    expect(mockS3.headObject).not.toHaveBeenCalled();
  });

  it("rejects empty or whitespace object id", async () => {
    const mockS3 = {
      headObject: vi.fn(),
      getPresignedReadUrl: vi.fn(),
    };
    const mockAudit = {
      record: vi.fn(),
    };

    const service = new CreateReadGrant(mockS3 as never, mockAudit as never);

    await expect(service.execute("", mockDoctor)).rejects.toThrow(
      StoredObjectNotFoundError,
    );
    await expect(service.execute("   ", mockDoctor)).rejects.toThrow(
      StoredObjectNotFoundError,
    );

    expect(mockS3.headObject).not.toHaveBeenCalled();
  });

  it("works with functional helper createReadGrant", async () => {
    const mockS3 = {
      headObject: vi.fn().mockResolvedValue({ sizeBytes: 1024, contentType: "image/png" }),
      getPresignedReadUrl: vi.fn().mockResolvedValue("https://s3.local/clinical-media/uuid?sig=abc"),
    };
    const mockAudit = {
      record: vi.fn().mockResolvedValue({ id: "evt-read-2" }),
    };

    const service = new CreateReadGrant(mockS3 as never, mockAudit as never);
    const result = await createReadGrant(service, "img-456", mockDoctor);

    expect(result.url).toBe("https://s3.local/clinical-media/uuid?sig=abc");
    expect(mockS3.headObject).toHaveBeenCalledWith("clinical/img-456");
  });
});

