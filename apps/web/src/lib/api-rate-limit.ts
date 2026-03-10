const requests = new Map<string, { count: number; resetAt: number }>();

const MAX_REQUESTS = 100;
const WINDOW_MS = 60_000; // 1 minute

function getIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]!.trim();
  }
  return "unknown";
}

export function rateLimitByIp(request: Request): {
  allowed: boolean;
  retryAfterMs: number;
} {
  const ip = getIp(request);
  const now = Date.now();
  const entry = requests.get(ip);

  // Clean up stale entries periodically (every ~100 calls)
  if (Math.random() < 0.01) {
    for (const [key, val] of requests) {
      if (now >= val.resetAt) {
        requests.delete(key);
      }
    }
  }

  if (!entry || now >= entry.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, retryAfterMs: 0 };
}
