import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // This is only the local Docker default for Prisma CLI commands.
    // The Nest application still requires DATABASE_URL through loadEnv.
    url:
      process.env.DATABASE_URL ??
      "postgresql://skinlab:skinlab@localhost:5434/skinlab",
  },
});
