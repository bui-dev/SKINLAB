import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "../../identity/domain/authenticated-user";
import { InvalidMimeTypeError } from "../domain/stored-object";
import { StorePrivateObject, storePrivateObject } from "./store-private-object";

describe("StorePrivateObject unit tests", () => {
  const mockDoctor: AuthenticatedUser = {
    subject: "doc-1",
    role: "doctor",
    permission: "clinical-record:read",
    accessContext: "clinic",
    deviceFingerprint: "sha256:cert-fp-doc",
  };

  it("stores a valid image and triggers audit recording", async () => {
    const mockS3 = {
      getBucketName: vi.fn().mockReturnValue("skinlab-clinical-media"),
      putObject: vi.fn().mockResolvedValue(undefined),
    };
    const mockAuditService = {
      record: vi.fn().mockResolvedValue({ id: "evt-1" }),
    };

    const service = new StorePrivateObject(
      mockS3 as never,
      mockAuditService as never,
    );

    const input = {
      content: Buffer.from("valid-jpeg-bytes"),
      contentType: "image/jpeg",
    };

    const result = await service.execute(input, mockDoctor);

    expect(result.id).toBeDefined();
    expect(result.key).toMatch(/^clinical\/[0-9a-f-]+$/);
    expect(result.bucket).toBe("skinlab-clinical-media");
    expect(result.contentType).toBe("image/jpeg");
    expect(result.sizeBytes).toBe(input.content.length);
    expect(result.sha256Checksum).toBeDefined();

    expect(mockS3.putObject).toHaveBeenCalledTimes(1);
    expect(mockAuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "media.object.stored",
        entityType: "stored_object",
        entityId: result.id,
        actor: {
          subject: "doc-1",
          role: "doctor",
          accessContext: "clinic",
          deviceFingerprint: "sha256:cert-fp-doc",
        },
      }),
    );
  });

  it("fails immediately and does not call S3 if MIME type is invalid", async () => {
    const mockS3 = {
      getBucketName: vi.fn().mockReturnValue("skinlab-clinical-media"),
      putObject: vi.fn(),
    };
    const mockAuditService = {
      record: vi.fn(),
    };

    const service = new StorePrivateObject(
      mockS3 as never,
      mockAuditService as never,
    );

    await expect(
      service.execute({
        content: Buffer.from("bad-bytes"),
        contentType: "application/pdf",
      }),
    ).rejects.toThrow(InvalidMimeTypeError);

    expect(mockS3.putObject).not.toHaveBeenCalled();
    expect(mockAuditService.record).not.toHaveBeenCalled();
  });

  it("works with functional helper storePrivateObject", async () => {
    const mockS3 = {
      getBucketName: vi.fn().mockReturnValue("skinlab-clinical-media"),
      putObject: vi.fn().mockResolvedValue(undefined),
    };
    const mockAuditService = {
      record: vi.fn().mockResolvedValue({ id: "evt-2" }),
    };

    const service = new StorePrivateObject(
      mockS3 as never,
      mockAuditService as never,
    );

    const result = await storePrivateObject(
      service,
      {
        content: Buffer.from("png-bytes"),
        contentType: "image/png",
      },
      mockDoctor,
    );

    expect(result.contentType).toBe("image/png");
    expect(mockS3.putObject).toHaveBeenCalledTimes(1);
  });

  it("normalizes uppercase and parameterized MIME types", async () => {
    const mockS3 = {
      getBucketName: vi.fn().mockReturnValue("skinlab-clinical-media"),
      putObject: vi.fn().mockResolvedValue(undefined),
    };
    const mockAuditService = {
      record: vi.fn().mockResolvedValue({ id: "evt-3" }),
    };

    const service = new StorePrivateObject(
      mockS3 as never,
      mockAuditService as never,
    );

    const result = await service.execute(
      {
        content: Buffer.from("jpeg-bytes"),
        contentType: "IMAGE/JPEG; charset=binary",
      },
      mockDoctor,
    );

    expect(result.contentType).toBe("image/jpeg");
    expect(mockS3.putObject).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Buffer),
      "image/jpeg",
      expect.any(Object),
    );
  });

  it("throws when input is undefined", async () => {
    const mockS3 = {
      getBucketName: vi.fn().mockReturnValue("skinlab-clinical-media"),
      putObject: vi.fn(),
    };
    const mockAuditService = {
      record: vi.fn(),
    };

    const service = new StorePrivateObject(
      mockS3 as never,
      mockAuditService as never,
    );

    await expect(service.execute(undefined as never)).rejects.toThrow();
  });
});

