// @vitest-environment node

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/auth/refresh", () => {
  it("rejects_cross_origin_requests_before_reading_or_rotating_a_session", async () => {
    const request = new NextRequest("https://skinlab.test/api/auth/refresh", {
      method: "POST",
      headers: { origin: "https://attacker.test" },
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
  });
});
