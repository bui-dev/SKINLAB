import { describe, expect, it } from "vitest";

import { createA0Fixtures } from "./fixtures";

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectKeys);
  }

  if (value === null || typeof value !== "object") {
    return [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => [
    key,
    ...collectKeys(nestedValue),
  ]);
}

describe("createA0Fixtures", () => {
  it("creates_fake_two_doctor_day_without_sensitive_fields", () => {
    const fixtures = createA0Fixtures();

    expect(fixtures.clinicHours).toEqual({
      opensAt: "09:00",
      closesAt: "19:00",
    });
    expect(fixtures.doctors).toHaveLength(2);
    expect(fixtures.appointments.some(({ kind }) => kind === "booked")).toBe(
      true,
    );
    expect(fixtures.appointments.some(({ kind }) => kind === "walk_in")).toBe(
      true,
    );
    expect(
      fixtures.appointments.every(({ patientLabel }) =>
        /^BN-\d{3}$/.test(patientLabel),
      ),
    ).toBe(true);

    const forbiddenKeys = new Set([
      "phone",
      "email",
      "address",
      "diagnosis",
      "clinicalImage",
      "clinicalImages",
      "image",
      "images",
    ]);

    expect(
      collectKeys(fixtures).filter((key) => forbiddenKeys.has(key)),
    ).toEqual([]);
  });
});
