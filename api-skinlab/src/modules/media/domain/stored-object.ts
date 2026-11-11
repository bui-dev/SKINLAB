// All comments are in English per project rules.

export class MediaSecurityViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaSecurityViolationError";
  }
}

export class InvalidMimeTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMimeTypeError";
  }
}

export class FilePayloadTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FilePayloadTooLargeError";
  }
}

export class StoredObjectNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoredObjectNotFoundError";
  }
}

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const MAX_IMAGE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB maximum
export const DEFAULT_READ_GRANT_TTL_SECONDS = 300; // 5 minutes
export const MAX_READ_GRANT_TTL_SECONDS = 900; // 15 minutes maximum

export type StoredObjectRef = {
  id: string;
  key: string;
  bucket: string;
  contentType: string;
  sizeBytes: number;
  sha256Checksum: string;
  createdAt: Date;
};

export type StoreObjectInput = {
  content: Buffer;
  contentType: string;
  filename?: string;
  metadata?: Record<string, string>;
};

export type ShortLivedReadUrl = {
  url: string;
  expiresAt: Date;
};

export function validateImageUpload(content: Buffer, contentType: string): void {
  if (!content || !Buffer.isBuffer(content)) {
    throw new FilePayloadTooLargeError("File content must be a valid Buffer.");
  }

  if (!contentType || typeof contentType !== "string") {
    throw new InvalidMimeTypeError("Content type must be specified.");
  }

  const normalizedType = contentType.trim().toLowerCase().split(";")[0].trim();
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(normalizedType as AllowedImageMimeType)) {
    throw new InvalidMimeTypeError(
      `Unsupported MIME type "${contentType}". Only ${ALLOWED_IMAGE_MIME_TYPES.join(", ")} are allowed.`,
    );
  }

  if (content.length > MAX_IMAGE_FILE_SIZE_BYTES) {
    throw new FilePayloadTooLargeError(
      `File size (${content.length} bytes) exceeds maximum limit of ${MAX_IMAGE_FILE_SIZE_BYTES} bytes.`,
    );
  }

  if (content.length === 0) {
    throw new FilePayloadTooLargeError("File content cannot be empty.");
  }
}

