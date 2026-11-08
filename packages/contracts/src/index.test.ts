import { describe, expect, it } from "vitest";

import { ContractVersion } from "@skinlab/contracts";

describe("shared contracts", () => {
  it("publishes contract version 1", () => {
    expect(ContractVersion).toBe(1);
  });
});
