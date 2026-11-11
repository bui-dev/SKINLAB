import { Injectable } from "@nestjs/common";

import { RecordAuditEvent } from "../../audit/application/record-audit-event";
import type { AuthenticatedUser } from "../../identity/domain/authenticated-user";
import {
  DEFAULT_READ_GRANT_TTL_SECONDS,
  MAX_READ_GRANT_TTL_SECONDS,
  MediaSecurityViolationError,
  type ShortLivedReadUrl,
  StoredObjectNotFoundError,
} from "../domain/stored-object";
import { S3ObjectStore } from "../infrastructure/s3-object-store";

@Injectable()
export class CreateReadGrant {
  constructor(
    private readonly s3Store: S3ObjectStore,
    private readonly auditRecordService: RecordAuditEvent,
  ) {}

  async execute(
    objectIdOrKey: string,
    actor: AuthenticatedUser,
    ttlSeconds: number = DEFAULT_READ_GRANT_TTL_SECONDS,
  ): Promise<ShortLivedReadUrl> {
    if (!actor) {
      throw new MediaSecurityViolationError("Actor must be provided for media access.");
    }

    // CRITICAL SECURITY GUARD: Only doctors can access patient clinical images.
    if (actor.role !== "doctor") {
      throw new MediaSecurityViolationError(
        `Unauthorized media access: Only doctors can access clinical images. Actor role "${actor.role}" is forbidden.`,
      );
    }

    // CRITICAL SECURITY GUARD: Clinical images cannot be accessed remotely.
    if (actor.accessContext !== "clinic") {
      throw new MediaSecurityViolationError(
        `Unauthorized media access: Clinical images cannot be accessed remotely. Access context "${actor.accessContext}" is forbidden.`,
      );
    }

    if (ttlSeconds <= 0 || ttlSeconds > MAX_READ_GRANT_TTL_SECONDS) {
      throw new MediaSecurityViolationError(
        `Read grant TTL must be between 1 and ${MAX_READ_GRANT_TTL_SECONDS} seconds.`,
      );
    }

    if (
      !objectIdOrKey ||
      typeof objectIdOrKey !== "string" ||
      objectIdOrKey.trim().length === 0
    ) {
      throw new StoredObjectNotFoundError("Object ID or key must be provided.");
    }

    const trimmedIdOrKey = objectIdOrKey.trim();
    const key = trimmedIdOrKey.startsWith("clinical/")
      ? trimmedIdOrKey
      : `clinical/${trimmedIdOrKey}`;

    if (
      key === "clinical/" ||
      key.includes("..") ||
      key.includes("//")
    ) {
      throw new MediaSecurityViolationError(
        `Invalid object key: Path traversal detected.`,
      );
    }

    const head = await this.s3Store.headObject(key);
    if (!head) {
      throw new StoredObjectNotFoundError(
        `Stored object with key "${key}" was not found in storage.`,
      );
    }

    const url = await this.s3Store.getPresignedReadUrl(key, ttlSeconds);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.auditRecordService.record({
      action: "media.object.read_granted",
      entityType: "stored_object",
      entityId: objectIdOrKey,
      actor: {
        subject: actor.subject,
        role: actor.role,
        accessContext: actor.accessContext,
        deviceFingerprint: actor.deviceFingerprint,
      },
      metadata: {
        key,
        ttlSeconds,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      url,
      expiresAt,
    };
  }
}

/**
 * Functional helper for creating a read grant directly.
 */
export async function createReadGrant(
  service: CreateReadGrant,
  objectIdOrKey: string,
  actor: AuthenticatedUser,
  ttlSeconds?: number,
): Promise<ShortLivedReadUrl> {
  return service.execute(objectIdOrKey, actor, ttlSeconds);
}

