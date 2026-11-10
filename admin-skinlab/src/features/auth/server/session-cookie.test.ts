import { describe, expect, it } from "vitest";

import {
  clearLoginAttemptCookie,
  clearSessionCookie,
  issueLoginAttemptCookie,
  issueSessionCookie,
} from "./session-cookie";

describe("session cookies", () => {
  it("issues_a_short_lived_lax_login_attempt_cookie", () => {
    expect(issueLoginAttemptCookie("attempt-01")).toEqual({
      name: "skinlab_login_attempt",
      value: "attempt-01",
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 300,
      },
    });
  });

  it("issues_a_strict_opaque_session_cookie", () => {
    expect(issueSessionCookie("opaque-session-id")).toEqual({
      name: "skinlab_session",
      value: "opaque-session-id",
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
      },
    });
  });

  it("clears_both_cookies_without_exposing_their_values", () => {
    expect(clearLoginAttemptCookie()).toMatchObject({
      name: "skinlab_login_attempt",
      value: "",
      options: { maxAge: 0, httpOnly: true, secure: true },
    });
    expect(clearSessionCookie()).toMatchObject({
      name: "skinlab_session",
      value: "",
      options: { maxAge: 0, httpOnly: true, secure: true },
    });
  });
});
