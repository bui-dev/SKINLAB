import { describe, expect, it, vi } from "vitest";

import { recordAuditEvent, RecordAuditEvent } from "./record-audit-event";

describe("RecordAuditEvent unit tests", () => {
  const sampleEvent = {
    action: "user.role.update",
    entityType: "user",
    entityId: "u-1",
    actor: {
      subject: "admin-1",
      role: "admin" as const,
      accessContext: "clinic" as const,
      deviceFingerprint: "sha256:admin-cert",
    },
    metadata: { newRole: "doctor" },
  };

  it("delegates to repository.create when called via service class", async () => {
    const mockRepo = {
      create: vi.fn().mockResolvedValue({ id: "evt-1", ...sampleEvent }),
    };

    const service = new RecordAuditEvent(mockRepo as never);
    const result = await service.record(sampleEvent);

    expect(result.id).toBe("evt-1");
    expect(mockRepo.create).toHaveBeenCalledWith(sampleEvent, undefined);
  });

  it("delegates to repository.create via execute method", async () => {
    const mockRepo = {
      create: vi.fn().mockResolvedValue({ id: "evt-2", ...sampleEvent }),
    };

    const service = new RecordAuditEvent(mockRepo as never);
    const result = await service.execute(sampleEvent);

    expect(result.id).toBe("evt-2");
    expect(mockRepo.create).toHaveBeenCalledWith(sampleEvent, undefined);
  });

  it("works with polymorphic recordAuditEvent helper with repository or service", async () => {
    const mockRepo = {
      create: vi.fn().mockResolvedValue({ id: "evt-3", ...sampleEvent }),
    };

    const resultRepo = await recordAuditEvent(mockRepo as never, sampleEvent);
    expect(resultRepo.id).toBe("evt-3");

    const service = new RecordAuditEvent(mockRepo as never);
    const resultSvc = await recordAuditEvent(service, sampleEvent);
    expect(resultSvc.id).toBe("evt-3");
  });
});
