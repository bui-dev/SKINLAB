import { TestOidcIssuer } from "../support/test-oidc-issuer";

export const VALID_HMAC_KEY_BASE64 =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
export const VALID_GATEWAY_FINGERPRINT =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
export const REGISTERED_CLINIC_DEVICE =
  "1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff";
export const REGISTERED_ADMIN_DEVICE =
  "222233334444555566667777888899990000aaaabbbbccccddddeeeeffff1111";
export const UNREGISTERED_DEVICE =
  "9999999999999999999999999999999999999999999999999999999999999999";

export const DOCTOR_USER = {
  sub: "doctor-fake-sub-001",
  email: "doctor.fake@skinlab.test",
  role: "doctor" as const,
};

export const RECEPTIONIST_USER = {
  sub: "reception-fake-sub-001",
  email: "reception.fake@skinlab.test",
  role: "receptionist" as const,
};

export const ADMIN_USER = {
  sub: "admin-fake-sub-001",
  email: "admin.fake@skinlab.test",
  role: "admin" as const,
};

export type FoundationHarness = {
  oidcIssuer: TestOidcIssuer;
  hmacKey: string;
  gatewayFingerprint: string;
  cleanup: () => Promise<void>;
};

export async function startFoundationHarness(): Promise<FoundationHarness> {
  const oidcIssuer = new TestOidcIssuer();
  await oidcIssuer.start();

  return {
    oidcIssuer,
    hmacKey: VALID_HMAC_KEY_BASE64,
    gatewayFingerprint: VALID_GATEWAY_FINGERPRINT,
    cleanup: async () => {
      await oidcIssuer.close();
    },
  };
}

