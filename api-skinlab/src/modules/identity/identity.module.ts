import { Module } from "@nestjs/common";

import { loadEnv } from "../../config/env";
import { DatabaseModule } from "../../platform/database/database.module";
import { PrismaService } from "../../platform/database/prisma.service";

import { CreateLoginAttempt } from "./application/create-login-attempt";
import { CreateSessionFromOidc } from "./application/create-session-from-oidc";
import { ConsumeLoginAttempt } from "./application/consume-login-attempt";
import { GetSession } from "./application/get-session";
import { GetRefreshToken } from "./application/get-refresh-token";
import { RefreshSession } from "./application/refresh-session";
import { RevokeSession } from "./application/revoke-session";
import { BffExchangeNonceRepository } from "./infrastructure/bff-exchange-nonce-repository";
import { GatewayAssertionRepository } from "./infrastructure/gateway-assertion-repository";
import {
  OidcTokenVerifier,
  type Jwks,
} from "./infrastructure/oidc-token-verifier";
import { LoginAttemptRepository } from "./infrastructure/prisma-login-attempt-repository";
import { RegisteredDeviceRepository } from "./infrastructure/registered-device-repository";
import { SessionRepository } from "./infrastructure/prisma-session-repository";
import { IdentityAccountRepository } from "./infrastructure/identity-account-repository";
import { AuthGuard } from "./http/auth.guard";
import { SessionAuthenticationAdapter } from "./http/session-authentication-adapter";
import {
  SessionController,
  SESSION_CONTROLLER_DEPENDENCIES,
  type SessionControllerDependencies,
} from "./http/session.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [SessionController],
  providers: [
    AuthGuard,
    SessionAuthenticationAdapter,
    {
      provide: LoginAttemptRepository,
      useFactory: (prisma: PrismaService) => new LoginAttemptRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: BffExchangeNonceRepository,
      useFactory: (prisma: PrismaService) =>
        new BffExchangeNonceRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: GatewayAssertionRepository,
      useFactory: (prisma: PrismaService) =>
        new GatewayAssertionRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: RegisteredDeviceRepository,
      useFactory: (prisma: PrismaService) =>
        new RegisteredDeviceRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: SessionRepository,
      useFactory: (prisma: PrismaService) => new SessionRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: IdentityAccountRepository,
      useFactory: (prisma: PrismaService) =>
        new IdentityAccountRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: OidcTokenVerifier,
      useFactory: () => {
        const env = loadEnv(process.env);
        return new OidcTokenVerifier({
          issuer: env.OIDC_ISSUER,
          audience: env.OIDC_AUDIENCE,
          requiredAcr: "2",
          now: () => new Date(),
          loadJwks: async () => {
            const response = await fetch(env.OIDC_JWKS_URL);
            if (!response.ok) throw new Error("The OIDC JWKS request failed.");
            return (await response.json()) as Jwks;
          },
        });
      },
    },
    {
      provide: CreateLoginAttempt,
      useFactory: (repository: LoginAttemptRepository) =>
        new CreateLoginAttempt(
          repository,
          loadEnv(process.env).TOKEN_ENCRYPTION_KEY,
        ),
      inject: [LoginAttemptRepository],
    },
    {
      provide: ConsumeLoginAttempt,
      useFactory: (repository: LoginAttemptRepository) =>
        new ConsumeLoginAttempt(
          repository,
          loadEnv(process.env).TOKEN_ENCRYPTION_KEY,
        ),
      inject: [LoginAttemptRepository],
    },
    {
      provide: CreateSessionFromOidc,
      useFactory: (
        repository: SessionRepository,
        accounts: IdentityAccountRepository,
      ) =>
        new CreateSessionFromOidc(
          repository,
          accounts,
          loadEnv(process.env).TOKEN_ENCRYPTION_KEY,
        ),
      inject: [SessionRepository, IdentityAccountRepository],
    },
    {
      provide: GetSession,
      useFactory: (
        repository: SessionRepository,
        accounts: IdentityAccountRepository,
      ) => new GetSession(repository, accounts),
      inject: [SessionRepository, IdentityAccountRepository],
    },
    {
      provide: RevokeSession,
      useFactory: (repository: SessionRepository) =>
        new RevokeSession(repository),
      inject: [SessionRepository],
    },
    {
      provide: GetRefreshToken,
      useFactory: (
        repository: SessionRepository,
        accounts: IdentityAccountRepository,
      ) =>
        new GetRefreshToken(
          repository,
          accounts,
          loadEnv(process.env).TOKEN_ENCRYPTION_KEY,
        ),
      inject: [SessionRepository, IdentityAccountRepository],
    },
    {
      provide: RefreshSession,
      useFactory: (repository: SessionRepository) =>
        new RefreshSession(
          repository,
          loadEnv(process.env).TOKEN_ENCRYPTION_KEY,
        ),
      inject: [SessionRepository],
    },
    {
      provide: SESSION_CONTROLLER_DEPENDENCIES,
      useFactory: (
        createLoginAttempt: CreateLoginAttempt,
        consumeLoginAttempt: ConsumeLoginAttempt,
        nonceRepository: BffExchangeNonceRepository,
        gatewayAssertionRepository: GatewayAssertionRepository,
        registeredDeviceRepository: RegisteredDeviceRepository,
        createSession: CreateSessionFromOidc,
        oidcTokenVerifier: OidcTokenVerifier,
        getSession: GetSession,
        revokeSession: RevokeSession,
        getRefreshToken: GetRefreshToken,
        refreshSession: RefreshSession,
      ) =>
        ({
          key: loadEnv(process.env).BFF_EXCHANGE_HMAC_KEY,
          now: () => new Date(),
          createLoginAttempt,
          consumeLoginAttempt,
          consumeNonce: (nonce, expiresAt) =>
            nonceRepository.consume(nonce, expiresAt),
          createSession,
          verifyAccessToken: oidcTokenVerifier,
          consumeGatewayAssertion: (id, expiresAt) =>
            gatewayAssertionRepository.consume(id, expiresAt),
          findRegisteredDevice: registeredDeviceRepository,
          gatewayAssertionKey: loadEnv(process.env).GATEWAY_ASSERTION_HMAC_KEY,
          configuredGatewayFingerprint: loadEnv(process.env)
            .GATEWAY_CLIENT_CERT_FINGERPRINT,
          getSession,
          revokeSession,
          getRefreshToken,
          refreshSession,
        }) satisfies SessionControllerDependencies,
      inject: [
        CreateLoginAttempt,
        ConsumeLoginAttempt,
        BffExchangeNonceRepository,
        GatewayAssertionRepository,
        RegisteredDeviceRepository,
        CreateSessionFromOidc,
        OidcTokenVerifier,
        GetSession,
        RevokeSession,
        GetRefreshToken,
        RefreshSession,
      ],
    },
  ],
})
export class IdentityModule {}
