import { describe, expect, it } from "vitest";

import {
  FilePayloadTooLargeError,
  InvalidMimeTypeError,
  validateImageUpload,
} from "./stored-object";

describe("stored-object domain validation", () => {
  it("accepts valid image uploads for allowed MIME types", () => {
    const validBuffer = Buffer.from("fake-image-bytes");
    expect(() => validateImageUpload(validBuffer, "image/jpeg")).not.toThrow();
    expect(() => validateImageUpload(validBuffer, "image/png")).not.toThrow();
    expect(() => validateImageUpload(validBuffer, "image/webp")).not.toThrow();
  });

  it("throws InvalidMimeTypeError for unsupported MIME types", () => {
    const validBuffer = Buffer.from("fake-image-bytes");
    expect(() => validateImageUpload(validBuffer, "application/pdf")).toThrow(
      InvalidMimeTypeError,
    );
    expect(() => validateImageUpload(validBuffer, "text/html")).toThrow(
      InvalidMimeTypeError,
    );
    expect(() => validateImageUpload(validBuffer, "image/gif")).toThrow(
      InvalidMimeTypeError,
    );
  });

  it("throws FilePayloadTooLargeError when content exceeds 10MB", () => {
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);
    expect(() => validateImageUpload(largeBuffer, "image/jpeg")).toThrow(
      FilePayloadTooLargeError,
    );
  });

  it("throws FilePayloadTooLargeError when content is empty", () => {
    const emptyBuffer = Buffer.alloc(0);
    expect(() => validateImageUpload(emptyBuffer, "image/jpeg")).toThrow(
      FilePayloadTooLargeError,
    );
  });
});

