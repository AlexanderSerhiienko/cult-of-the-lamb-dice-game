import { consumeInMemoryRateLimit } from "@/server/security/rate-limit-memory";
import { createConsoleTelemetrySink } from "@/server/observability/telemetry";
import { consumeUpstashRateLimit, isUpstashRateLimitConfigured } from "@/server/security/rate-limit-upstash";

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec: number;
};

const telemetry = createConsoleTelemetrySink("web");

export async function consumeRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  if (isUpstashRateLimitConfigured()) {
    try {
      return await consumeUpstashRateLimit(params);
    } catch (error) {
      telemetry.trackError("rate_limit.upstash_fallback_to_memory", {
        key: params.key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return consumeInMemoryRateLimit(params);
}
