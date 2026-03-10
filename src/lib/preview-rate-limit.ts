import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const PREVIEW_LIMIT = 2;
const WINDOW_SEC = 24 * 60 * 60; // 24 hours

let _ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!_ratelimit) {
    const redis = new Redis({ url, token });
    _ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(PREVIEW_LIMIT, `${WINDOW_SEC} s`),
      prefix: "preview",
    });
  }
  return _ratelimit;
}

export async function checkPreviewRateLimit(identifier: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const rl = getRatelimit();
  if (!rl) {
    return { allowed: true, remaining: PREVIEW_LIMIT, limit: PREVIEW_LIMIT };
  }
  const { success, remaining, limit } = await rl.limit(identifier);
  return { allowed: success, remaining, limit };
}

export async function getPreviewRateLimitRemaining(identifier: string): Promise<number> {
  const rl = getRatelimit();
  if (!rl) return PREVIEW_LIMIT;
  const { remaining } = await rl.limit(identifier);
  return remaining;
}

const DEMO_DAILY_CAP = 500; // ~$5/day at ~$0.01/demo

/** Check daily demo run cap to prevent runaway costs. Returns true if over cap. */
export async function checkDemoDailyCap(): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return false;
  const redis = new Redis({ url, token });
  const todayKey = `demo:spend:${new Date().toISOString().split("T")[0]}`;
  const todayRuns = await redis.incr(todayKey);
  await redis.expire(todayKey, 86400); // 24h
  return todayRuns > DEMO_DAILY_CAP;
}
