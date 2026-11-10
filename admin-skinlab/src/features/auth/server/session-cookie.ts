export type CookieInstruction = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: true;
    sameSite: "lax" | "strict";
    path: "/";
    maxAge?: number;
  };
};

const loginAttemptCookieName = "skinlab_login_attempt";
const sessionCookieName = "skinlab_session";

export function issueLoginAttemptCookie(
  attemptId: string,
  name = loginAttemptCookieName,
): CookieInstruction {
  return {
    name,
    value: attemptId,
    options: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 300,
    },
  };
}

export function clearLoginAttemptCookie(
  name = loginAttemptCookieName,
): CookieInstruction {
  return {
    name,
    value: "",
    options: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    },
  };
}

export function issueSessionCookie(
  sessionId: string,
  name = sessionCookieName,
): CookieInstruction {
  return {
    name,
    value: sessionId,
    options: {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    },
  };
}

export function clearSessionCookie(
  name = sessionCookieName,
): CookieInstruction {
  return {
    name,
    value: "",
    options: {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    },
  };
}
