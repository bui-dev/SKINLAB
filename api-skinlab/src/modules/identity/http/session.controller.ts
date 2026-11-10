import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Headers,
  Post,
  Body,
  Inject,
  Param,
  Req,
} from "@nestjs/common";
import { z } from "zod";

import type { CreateLoginAttempt } from "../application/create-login-attempt";
import type { CreateSessionFromOidc } from "../application/create-session-from-oidc";
import type { ConsumeLoginAttempt } from "../application/consume-login-attempt";
import type { GetSession } from "../application/get-session";
import type { GetRefreshToken } from "../application/get-refresh-token";
import type { RefreshSession } from "../application/refresh-session";
import type { RevokeSession } from "../application/revoke-session";
import {
  BffExchangeVerificationError,
  verifyBffExchange,
} from "../infrastructure/bff-exchange-verifier";
import {
  type GatewayAssertion,
  GatewayAssertionError,
  verifyGatewayAssertion,
} from "../infrastructure/gateway-assertion";
import type { OidcTokenVerifier } from "../infrastructure/oidc-token-verifier";
import type { RegisteredDeviceRepository } from "../infrastructure/registered-device-repository";

const createLoginAttemptSchema = z.object({
  state: z.string().min(1),
  nonce: z.string().min(1),
  codeVerifier: z.string().min(1),
  expiresAt: z.string().datetime(),
});
const consumeLoginAttemptSchema = z.object({
  returnedState: z.string().min(1),
});
const gatewayAssertionSchema = z.object({
  id: z.string().min(1),
  issuedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  method: z.string().min(1),
  target: z.string().min(1),
  bodyHash: z.string().regex(/^[a-f0-9]{64}$/),
  deviceFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  context: z.enum(["clinic", "remote"]),
  signature: z.string().min(1),
});
const createSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  gatewayAssertion: gatewayAssertionSchema,
});
const emptyBodyHash =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const refreshSessionSchema = z.object({
  sessionId: z.string().min(1),
  previousRefreshToken: z.string().min(1),
  nextRefreshToken: z.string().min(1),
  accessToken: z.string().min(1),
  gatewayAssertion: gatewayAssertionSchema,
});
const sessionIdSchema = z.object({ sessionId: z.string().min(1) });

export type SessionControllerDependencies = {
  key: string;
  now: () => Date;
  createLoginAttempt: Pick<CreateLoginAttempt, "execute">;
  consumeLoginAttempt: Pick<ConsumeLoginAttempt, "execute">;
  consumeNonce: (nonce: string, expiresAt: Date) => Promise<boolean>;
  createSession: Pick<CreateSessionFromOidc, "execute">;
  verifyAccessToken: Pick<OidcTokenVerifier, "verifyAccessToken">;
  consumeGatewayAssertion: (id: string, expiresAt: Date) => Promise<boolean>;
  findRegisteredDevice: Pick<RegisteredDeviceRepository, "find">;
  gatewayAssertionKey: string;
  configuredGatewayFingerprint: string;
  getSession: Pick<GetSession, "execute">;
  revokeSession: Pick<RevokeSession, "execute">;
  getRefreshToken: Pick<GetRefreshToken, "execute">;
  refreshSession: Pick<RefreshSession, "execute">;
};

export const SESSION_CONTROLLER_DEPENDENCIES = Symbol(
  "SESSION_CONTROLLER_DEPENDENCIES",
);

@Controller("internal")
export class SessionController {
  constructor(
    @Inject(SESSION_CONTROLLER_DEPENDENCIES)
    private readonly dependencies: SessionControllerDependencies,
  ) {}

  @Post("login-attempts")
  async createLoginAttempt(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<{ attemptId: string }> {
    const parsed = createLoginAttemptSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("The login attempt input is invalid.");
    }

    await this.verifyAndConsumeBffExchange(
      "/internal/login-attempts",
      body,
      headers,
    );

    return this.dependencies.createLoginAttempt.execute({
      ...parsed.data,
      expiresAt: new Date(parsed.data.expiresAt),
    });
  }

  @Post("login-attempts/:attemptId/consume")
  async consumeLoginAttempt(
    @Param("attemptId") attemptId: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<{ nonceHash: string; codeVerifier: string }> {
    const parsed = consumeLoginAttemptSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        "The login attempt consumption input is invalid.",
      );
    }
    await this.verifyAndConsumeBffExchange(
      `/internal/login-attempts/${attemptId}/consume`,
      body,
      headers,
    );

    return this.dependencies.consumeLoginAttempt.execute(
      attemptId,
      parsed.data.returnedState,
      this.dependencies.now(),
    );
  }

  @Post("sessions")
  async createSession(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | undefined>,
    @Req() request: { raw: { socket: unknown } },
  ): Promise<{ sessionId: string; expiresAt: string }> {
    const parsed = createSessionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("The session input is invalid.");
    }
    await this.verifyAndConsumeBffExchange("/internal/sessions", body, headers);

    try {
      const gatewayContext = await this.verifyGatewayAssertion(
        parsed.data.gatewayAssertion,
        request,
      );
      const identity =
        await this.dependencies.verifyAccessToken.verifyAccessToken(
          parsed.data.accessToken,
        );
      const session = await this.dependencies.createSession.execute({
        subject: identity.subject,
        role: identity.role,
        acr: identity.acr,
        deviceFingerprint: gatewayContext.deviceFingerprint,
        accessContext: gatewayContext.context,
        refreshToken: parsed.data.refreshToken,
        expiresAt: identity.expiresAt,
        now: this.dependencies.now(),
      });
      return {
        sessionId: session.id,
        expiresAt: session.expiresAt.toISOString(),
      };
    } catch (error) {
      if (
        error instanceof GatewayAssertionError ||
        error instanceof ForbiddenException
      ) {
        throw new ForbiddenException("The session access context is invalid.");
      }
      throw error;
    }
  }

  @Post("sessions/read")
  async getSession(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<{
    subject: string;
    role: string;
    accessContext: string;
    expiresAt: string;
  } | null> {
    const parsed = sessionIdSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("The session input is invalid.");
    await this.verifyAndConsumeBffExchange(
      "/internal/sessions/read",
      body,
      headers,
    );
    const session = await this.dependencies.getSession.execute(
      parsed.data.sessionId,
      this.dependencies.now(),
    );
    if (!session) return null;
    return {
      subject: session.subject,
      role: session.role,
      accessContext: session.accessContext,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  @Post("sessions/revoke")
  async revokeSession(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<{ revoked: true }> {
    const parsed = sessionIdSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("The session input is invalid.");
    await this.verifyAndConsumeBffExchange(
      "/internal/sessions/revoke",
      body,
      headers,
    );
    await this.dependencies.revokeSession.execute(
      parsed.data.sessionId,
      "browser-logout",
      this.dependencies.now(),
    );
    return { revoked: true };
  }

  @Post("sessions/refresh-token/read")
  async getRefreshToken(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | undefined>,
  ): Promise<{ refreshToken: string }> {
    const parsed = sessionIdSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException("The session input is invalid.");
    await this.verifyAndConsumeBffExchange(
      "/internal/sessions/refresh-token/read",
      body,
      headers,
    );
    return {
      refreshToken: await this.dependencies.getRefreshToken.execute(
        parsed.data.sessionId,
        this.dependencies.now(),
      ),
    };
  }

  @Post("sessions/refresh")
  async refreshSession(
    @Body() body: unknown,
    @Headers() headers: Record<string, string | undefined>,
    @Req() request: { raw: { socket: unknown } },
  ): Promise<{ expiresAt: string }> {
    const parsed = refreshSessionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("The refresh input is invalid.");
    }
    await this.verifyAndConsumeBffExchange(
      "/internal/sessions/refresh",
      body,
      headers,
    );
    const existingSession = await this.dependencies.getSession.execute(
      parsed.data.sessionId,
      this.dependencies.now(),
      true,
    );
    try {
      const accessContext = await this.verifyGatewayAssertion(
        parsed.data.gatewayAssertion,
        request,
        { method: "POST", target: "/api/auth/refresh" },
      );
      if (
        !existingSession ||
        accessContext.deviceFingerprint !== existingSession.deviceFingerprint ||
        accessContext.context !== existingSession.accessContext
      ) {
        throw new GatewayAssertionError("The session access context changed.");
      }
    } catch (error) {
      if (error instanceof GatewayAssertionError) {
        await this.dependencies.revokeSession.execute(
          parsed.data.sessionId,
          "refresh-access-context-invalid",
          this.dependencies.now(),
        );
        throw new ForbiddenException("The refresh access context is invalid.");
      }
      throw error;
    }
    const identity =
      await this.dependencies.verifyAccessToken.verifyAccessToken(
        parsed.data.accessToken,
      );
    if (
      !existingSession ||
      identity.subject !== existingSession.subject ||
      identity.role !== existingSession.role ||
      identity.acr !== "2"
    ) {
      await this.dependencies.revokeSession.execute(
        parsed.data.sessionId,
        "refresh-identity-mismatch",
        this.dependencies.now(),
      );
      throw new ForbiddenException("The refresh identity is invalid.");
    }
    try {
      const session = await this.dependencies.refreshSession.execute(
        parsed.data.sessionId,
        parsed.data.previousRefreshToken,
        parsed.data.nextRefreshToken,
        this.dependencies.now(),
      );
      return { expiresAt: session.expiresAt.toISOString() };
    } catch {
      await this.dependencies.revokeSession.execute(
        parsed.data.sessionId,
        "refresh-rotation-failed",
        this.dependencies.now(),
      );
      throw new ForbiddenException("The refresh rotation failed.");
    }
  }

  private async verifyAndConsumeBffExchange(
    target: string,
    body: unknown,
    headers: Record<string, string | undefined>,
  ): Promise<void> {
    let nonce: string;
    let expiry: Date;
    try {
      const verified = verifyBffExchange({
        key: this.dependencies.key,
        request: { method: "POST", target, body: JSON.stringify(body) },
        headers: {
          issuedAt: headers["x-skinlab-issued-at"] ?? "",
          nonce: headers["x-skinlab-nonce"] ?? "",
          signature: headers["x-skinlab-signature"] ?? "",
        },
        now: this.dependencies.now(),
        isNonceUsed: () => false,
      });
      nonce = verified.nonce;
      expiry = new Date(headers["x-skinlab-issued-at"]!);
      expiry.setMinutes(expiry.getMinutes() + 5);
    } catch (error) {
      if (error instanceof BffExchangeVerificationError) {
        throw new ForbiddenException("The BFF exchange is invalid.");
      }
      throw error;
    }

    if (!(await this.dependencies.consumeNonce(nonce, expiry))) {
      throw new ForbiddenException("The BFF exchange was replayed.");
    }
  }

  private async verifyGatewayAssertion(
    assertion: GatewayAssertion,
    request: { raw: { socket: unknown } },
    expectedRequest: Pick<GatewayAssertion, "method" | "target"> = {
      method: "GET",
      target: "/api/auth/callback",
    },
  ): Promise<Pick<GatewayAssertion, "deviceFingerprint" | "context">> {
    if (
      getTlsPeerFingerprint(request)?.toLowerCase() !==
      this.dependencies.configuredGatewayFingerprint.toLowerCase()
    ) {
      throw new GatewayAssertionError("The gateway TLS peer is invalid.");
    }
    const verified = await verifyGatewayAssertion(
      assertion,
      this.dependencies.gatewayAssertionKey,
      {
        method: expectedRequest.method,
        target: expectedRequest.target,
        bodyHash: emptyBodyHash,
        now: this.dependencies.now(),
        consume: this.dependencies.consumeGatewayAssertion,
      },
    );
    const device = await this.dependencies.findRegisteredDevice.find(
      verified.deviceFingerprint,
    );
    if (!device?.isActive) {
      throw new GatewayAssertionError("The device is unavailable.");
    }
    return verified;
  }
}

function getTlsPeerFingerprint(request: {
  raw: { socket: unknown };
}): string | null {
  const socket = request.raw.socket as {
    getPeerCertificate?: () => { fingerprint256?: string };
  };
  const fingerprint = socket.getPeerCertificate?.().fingerprint256;
  return fingerprint ? fingerprint.replaceAll(":", "") : null;
}
