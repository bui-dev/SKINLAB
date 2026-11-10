import { Controller, Get } from "@nestjs/common";

export type ReadinessResponse = {
  status: "ready" | "not_ready";
  checks: Record<string, boolean>;
};

@Controller("health")
export class HealthController {
  @Get("live")
  live(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  ready(): ReadinessResponse {
    return { status: "ready", checks: {} };
  }
}
