import { describe, expect, it } from "vitest";

import { clientEnvSchema, serverEnvSchema } from "@/config/env";

describe("environment schemas", () => {
  it("accepts valid server and public API URLs", () => {
    expect(
      serverEnvSchema.safeParse({ API_BASE_URL: "https://api.example.com" })
        .success,
    ).toBe(true);
    expect(
      clientEnvSchema.safeParse({
        NEXT_PUBLIC_API_BASE_URL: "https://api.example.com",
      }).success,
    ).toBe(true);
  });
});
