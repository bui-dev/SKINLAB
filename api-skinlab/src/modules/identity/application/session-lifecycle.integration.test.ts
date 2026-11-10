import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { promisify } from "node:util";

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaService } from "../../../platform/database/prisma.service";
import { SessionRepository } from "../infrastructure/prisma-session-repository";
import { IdentityAccountRepository } from "../infrastructure/identity-account-repository";

import { CreateSessionFromOidc } from "./create-session-from-oidc";
import { GetSession } from "./get-session";
import { RefreshSession } from "./refresh-session";
import { RevokeSession } from "./revoke-session";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const prismaCliPath = require.resolve("prisma/build/index.js");
const apiRoot = new URL("../../../../", import.meta.url).pathname;
const encryptionKey = Buffer.alloc(32, 2).toString("base64");

async function migrateDatabase(databaseUrl: string): Promise<void> {
  await execFileAsync(process.execPath, [prismaCliPath, "migrate", "deploy"], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}

describe("UserSession lifecycle", () => {
  let database: StartedPostgreSqlContainer;
  let prisma: PrismaService;
  let createSession: CreateSessionFromOidc;
  let getSession: GetSession;
  let refreshSession: RefreshSession;
  let revokeSession: RevokeSession;
  let repository: SessionRepository;

  beforeAll(async () => {
    database = await new PostgreSqlContainer("postgres:17-alpine")
      .withDatabase("skinlab")
      .withUsername("skinlab")
      .withPassword("skinlab")
      .start();
    await migrateDatabase(database.getConnectionUri());
    prisma = new PrismaService(database.getConnectionUri());
    repository = new SessionRepository(prisma);
    const accounts = new IdentityAccountRepository(prisma);
    createSession = new CreateSessionFromOidc(
      repository,
      accounts,
      encryptionKey,
    );
    getSession = new GetSession(repository, accounts);
    refreshSession = new RefreshSession(repository, encryptionKey);
    revokeSession = new RevokeSession(repository);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await database?.stop();
  });

  it("uses_an_opaque_session_id_and_rotates_refresh_state_once", async () => {
    const session = await createSession.execute({
      subject: "doctor-01",
      role: "doctor",
      acr: "2",
      deviceFingerprint:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      accessContext: "clinic",
      refreshToken: "refresh-01",
      expiresAt: new Date("2026-11-10T17:00:00.000Z"),
      now: new Date("2026-11-10T09:00:00.000Z"),
    });

    expect(session.id).not.toContain("refresh-01");
    await expect(
      getSession.execute(session.id, new Date("2026-11-10T09:01:00.000Z")),
    ).resolves.toMatchObject({ subject: "doctor-01" });
    await repository.beginRefresh(
      createHash("sha256").update(session.id).digest("hex"),
      new Date("2026-11-10T09:02:00.000Z"),
    );
    await expect(
      refreshSession.execute(
        session.id,
        "refresh-01",
        "refresh-02",
        new Date("2026-11-10T09:02:00.000Z"),
      ),
    ).resolves.toMatchObject({ id: session.id });
    await expect(
      refreshSession.execute(
        session.id,
        "refresh-01",
        "refresh-03",
        new Date("2026-11-10T09:03:00.000Z"),
      ),
    ).rejects.toThrow("unavailable");
  });

  it("globally_revokes_a_session_without_deleting_it", async () => {
    const session = await createSession.execute({
      subject: "doctor-02",
      role: "doctor",
      acr: "2",
      deviceFingerprint:
        "1123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      accessContext: "clinic",
      refreshToken: "refresh-04",
      expiresAt: new Date("2026-11-10T17:00:00.000Z"),
      now: new Date("2026-11-10T09:00:00.000Z"),
    });

    await revokeSession.execute(
      session.id,
      "user-disabled",
      new Date("2026-11-10T09:01:00.000Z"),
    );
    await expect(
      getSession.execute(session.id, new Date("2026-11-10T09:02:00.000Z")),
    ).resolves.toBeNull();
    await expect(
      prisma.userSession.count({
        where: {
          sessionIdHash: createHash("sha256").update(session.id).digest("hex"),
        },
      }),
    ).resolves.toBe(1);
  });

  it("blocks_every_existing_session_when_the_identity_account_is_disabled", async () => {
    const session = await createSession.execute({
      subject: "doctor-03",
      role: "doctor",
      acr: "2",
      deviceFingerprint:
        "2123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      accessContext: "clinic",
      refreshToken: "refresh-05",
      expiresAt: new Date("2026-11-10T17:00:00.000Z"),
      now: new Date("2026-11-10T09:00:00.000Z"),
    });
    await prisma.identityAccount.update({
      where: { subject: "doctor-03" },
      data: { isEnabled: false },
    });
    await expect(
      getSession.execute(session.id, new Date("2026-11-10T09:01:00.000Z")),
    ).resolves.toBeNull();
  });
});
