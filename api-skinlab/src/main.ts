import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";

import { AppModule } from "./app.module";
import { loadEnv } from "./config/env";
import { createInternalTlsOptions } from "./config/internal-tls";

async function bootstrap(): Promise<void> {
  const env = loadEnv(process.env);
  const adapter = new FastifyAdapter(createInternalTlsOptions(env));
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  );

  app.enableShutdownHooks();
  await app.listen(env.PORT, env.HOST);
}

void bootstrap();
