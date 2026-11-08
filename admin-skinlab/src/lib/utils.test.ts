import { describe, expect, it } from "vitest";

import { cn, isNonEmptyString, toSearchParams } from "@/lib/utils";

describe("shared utilities", () => {
  it("merges conditional and conflicting Tailwind classes", () => {
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4");
  });

  it("recognizes non-empty strings", () => {
    expect(isNonEmptyString(" SkinLab ")).toBe(true);
    expect(isNonEmptyString("   ")).toBe(false);
  });

  it("serializes query values while omitting empty values", () => {
    expect(
      toSearchParams({
        page: 2,
        active: true,
        tag: ["a", "b"],
        empty: null,
      }).toString(),
    ).toBe("page=2&active=true&tag=a&tag=b");
  });
});
