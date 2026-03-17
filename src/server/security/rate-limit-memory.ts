type RateBucket = {
  count: number;
  resetAt: number;
};

const rateBuckets = new Map<string, RateBucket>();

export function resetInMemoryRateLimitBuckets() {
  rateBuckets.clear();
}

export async function consumeInMemoryRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ ok: boolean; retryAfterSec: number }> {
  const now = Date.now();
  const bucket = rateBuckets.get(params.key);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(params.key, {
      count: 1,
      resetAt: now + params.windowMs,
    });
    return {
      ok: true,
      retryAfterSec: Math.ceil(params.windowMs / 1000),
    };
  }

  if (bucket.count >= params.limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}
