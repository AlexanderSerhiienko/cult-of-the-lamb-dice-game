import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeInMemoryRateLimit, resetInMemoryRateLimitBuckets } from "@/server/security/rate-limit-memory";
import { consumeRateLimit } from "@/server/security/rate-limit";
import * as upstashRateLimit from "@/server/security/rate-limit-upstash";

describe("rate limiting", () => {
  beforeEach(() => {
    resetInMemoryRateLimitBuckets();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("enforces the limit in memory mode", async () => {
    const first = await consumeInMemoryRateLimit({
      key: "rooms:create:user-1",
      limit: 2,
      windowMs: 60_000,
    });
    const second = await consumeInMemoryRateLimit({
      key: "rooms:create:user-1",
      limit: 2,
      windowMs: 60_000,
    });
    const third = await consumeInMemoryRateLimit({
      key: "rooms:create:user-1",
      limit: 2,
      windowMs: 60_000,
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });

  it("uses memory limiter when Upstash env vars are missing", async () => {
    const first = await consumeRateLimit({
      key: "rooms:join:user-1",
      limit: 1,
      windowMs: 60_000,
    });
    const second = await consumeRateLimit({
      key: "rooms:join:user-1",
      limit: 1,
      windowMs: 60_000,
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
  });

  it("uses Upstash limiter when env vars are configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    const upstashSpy = vi.spyOn(upstashRateLimit, "consumeUpstashRateLimit").mockResolvedValue({
      ok: true,
      retryAfterSec: 60,
    });

    const result = await consumeRateLimit({
      key: "rooms:create:user-2",
      limit: 10,
      windowMs: 60_000,
    });

    expect(result).toEqual({ ok: true, retryAfterSec: 60 });
    expect(upstashSpy).toHaveBeenCalledWith({
      key: "rooms:create:user-2",
      limit: 10,
      windowMs: 60_000,
    });
  });

  it("parses Upstash fixed-window script response", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ result: [0, 3, 4_200] }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await upstashRateLimit.consumeUpstashRateLimit({
      key: "rooms:create:user-3",
      limit: 2,
      windowMs: 60_000,
    });

    expect(result).toEqual({ ok: false, retryAfterSec: 5 });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("falls back to memory when Upstash request fails", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    const first = await consumeRateLimit({
      key: "rooms:create:user-4",
      limit: 1,
      windowMs: 60_000,
    });
    const second = await consumeRateLimit({
      key: "rooms:create:user-4",
      limit: 1,
      windowMs: 60_000,
    });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
  });
});
