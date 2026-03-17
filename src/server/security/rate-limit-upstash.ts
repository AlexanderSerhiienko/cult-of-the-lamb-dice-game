const FIXED_WINDOW_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[2])
end
local ttl = redis.call("PTTL", KEYS[1])
local allowed = 0
if current <= tonumber(ARGV[1]) then
  allowed = 1
end
return { allowed, current, ttl }
`;

type UpstashResponse = {
  result?: unknown;
  error?: string;
};

function readUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

function normalizeScriptResult(result: unknown): {
  ok: boolean;
  retryAfterSec: number;
} {
  if (!Array.isArray(result) || result.length < 3) {
    throw new Error("Unexpected Upstash rate limit response");
  }

  const allowed = Number(result[0]);
  const ttlMs = Number(result[2]);

  if (!Number.isFinite(allowed) || !Number.isFinite(ttlMs)) {
    throw new Error("Invalid Upstash rate limit payload");
  }

  return {
    ok: allowed === 1,
    retryAfterSec: Math.max(1, Math.ceil(Math.max(ttlMs, 0) / 1000)),
  };
}

export function isUpstashRateLimitConfigured(): boolean {
  return Boolean(readUpstashConfig());
}

export async function consumeUpstashRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<{ ok: boolean; retryAfterSec: number }> {
  const config = readUpstashConfig();
  if (!config) {
    throw new Error("Upstash rate limit is not configured");
  }

  const response = await fetch(`${config.url}/multi-exec`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["EVAL", FIXED_WINDOW_SCRIPT, "1", params.key, String(params.limit), String(params.windowMs)],
    ]),
  });

  if (!response.ok) {
    throw new Error(`Upstash rate limit failed with status ${response.status}`);
  }

  const payload = (await response.json()) as UpstashResponse[];
  const first = payload[0];
  if (!first || first.error) {
    throw new Error(first?.error ?? "Upstash rate limit request failed");
  }

  return normalizeScriptResult(first.result);
}
