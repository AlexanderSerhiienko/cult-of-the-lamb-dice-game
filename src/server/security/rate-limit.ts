import { consumeInMemoryRateLimit } from "@/server/security/rate-limit-memory";
import { consumeUpstashRateLimit, isUpstashRateLimitConfigured } from "@/server/security/rate-limit-upstash";

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec: number;
};

export async function consumeRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  if (isUpstashRateLimitConfigured()) {
    try {
      return await consumeUpstashRateLimit(params);
    } catch (error) {
      console.error("[rate-limit:upstash_fallback_to_memory]", {
        key: params.key,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return consumeInMemoryRateLimit(params);
}
