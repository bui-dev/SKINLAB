import { createHash, randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";

import { RecordAuditEvent } from "../../audit/application/record-audit-event";
import type { AuthenticatedUser } from "../../identity/domain/authenticated-user";
import {
  FilePayloadTooLargeError,
  type StoredObjectRef,
  type StoreObjectInput,
  validateImageUpload,
} from "../domain/stored-object";
import { S3ObjectStore } from "../infrastructure/s3-object-store";

@Injectable()
export class StorePrivateObject {
  constructor(
    private readonly s3Store: S3ObjectStore,
    private readonly auditRecordService: RecordAuditEvent,
  ) {}

  async execute(
    input: StoreObjectInput,
    actor?: AuthenticatedUser,
  ): Promise<StoredObjectRef> {
    if (!input) {
      throw new FilePayloadTooLargeError("StoreObjectInput must be provided.");
    }

    validateImageUpload(input.content, input.contentType);

    const normalizedContentType = input.contentType
      .trim()
      .toLowerCase()
      .split(";")[0]
      .trim();

    const sha256Checksum = createHash("sha256")
      .update(input.content)
      .digest("hex");
    const id = randomUUID();
    const key = `clinical/${id}`;
    const bucket = this.s3Store.getBucketName();
    const createdAt = new Date();

    await this.s3Store.putObject(key, input.content, normalizedContentType, {
      sha256: sha256Checksum,
      ...input.metadata,
    });

    if (actor) {
      await this.auditRecordService.record({
        action: "media.object.stored",
        entityType: "stored_object",
        entityId: id,
        actor: {
          subject: actor.subject,
          role: actor.role,
          accessContext: actor.accessContext,
          deviceFingerprint: actor.deviceFingerprint,
        },
        metadata: {
          key,
          bucket,
          contentType: normalizedContentType,
          sizeBytes: input.content.length,
          sha256Checksum,
        },
      });
    }

    return {
      id,
      key,
      bucket,
      contentType: normalizedContentType,
      sizeBytes: input.content.length,
      sha256Checksum,
      createdAt,
    };
  }
}

/**
 * Functional helper for storing a private object directly.
 */
export async function storePrivateObject(
  service: StorePrivateObject,
  input: StoreObjectInput,
  actor?: AuthenticatedUser,
): Promise<StoredObjectRef> {
  return service.execute(input, actor);
}

