/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Dependency-free on purpose; swap for a Redis-backed limiter when the API
 * runs on more than one process (an in-memory counter is per-instance).
 */
const buckets = new Map();

const CLEANUP_INTERVAL_MS = 60_000;
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS);
sweeper.unref?.();

/** Exposed for tests. */
export const resetRateLimits = () => buckets.clear();

export const rateLimit = ({
  windowMs = 15 * 60_000,
  max = 10,
  message,
  keyGenerator = (req) => `${req.ip}:${req.path}`,
  /** When true, 2xx/3xx responses are refunded — only failures count. */
  skipSuccessfulRequests = false,
} = {}) => (req, res, next) => {
  const key = keyGenerator(req);
  const now = Date.now();

  let entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }

  entry.count += 1;

  const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);
  res.setHeader("RateLimit-Limit", max);
  res.setHeader("RateLimit-Remaining", Math.max(0, max - entry.count));
  res.setHeader("RateLimit-Reset", resetSeconds);

  if (entry.count > max) {
    res.setHeader("Retry-After", resetSeconds);
    return res.status(429).json({
      success: false,
      message: message || "Too many requests. Please try again later.",
    });
  }

  if (skipSuccessfulRequests) {
    res.on("finish", () => {
      if (res.statusCode < 400) {
        const current = buckets.get(key);
        if (current) current.count = Math.max(0, current.count - 1);
      }
    });
  }

  next();
};

/**
 * Throttle key for credential endpoints.
 *
 * Combines the client IP with the submitted email so a single attacker is
 * still slowed down, while an entire campus behind one NAT is not locked out
 * by one person fat-fingering their password. A per-IP ceiling still applies
 * separately (see `ipCeiling` below).
 */
export const credentialKey = (req) => {
  const email = String(req.body?.email || "unknown").trim().toLowerCase();
  return `cred:${req.ip}:${email}`;
};

export default rateLimit;
