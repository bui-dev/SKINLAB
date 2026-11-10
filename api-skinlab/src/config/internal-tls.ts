import { readFileSync } from "node:fs";
import type { ServerOptions } from "node:https";

import type { ApiEnv } from "./env";

export type FastifyHttpsOptions = {
  https: ServerOptions;
};

export function createInternalTlsOptions(env: ApiEnv): FastifyHttpsOptions {
  return {
    https: {
      cert: readFileSync(env.INTERNAL_TLS_CERT_PATH),
      key: readFileSync(env.INTERNAL_TLS_KEY_PATH),
      ca: readFileSync(env.INTERNAL_TLS_CLIENT_CA_PATH),
      requestCert: true,
      rejectUnauthorized: true,
    },
  };
}
