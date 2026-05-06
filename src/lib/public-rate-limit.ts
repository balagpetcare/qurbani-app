import { getClientIp } from "@/lib/client-ip";

/** Bengali message for HTTP 429 on public forms. */
export const PUBLIC_RATE_LIMIT_MESSAGE_BN =
  "অনেক দ্রুত অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।";

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

const MAX_KEYS = 20_000;
const PRUNE_EVERY = 50;
let requestCounter = 0;

function pruneExpired(now: number): void {
  for (const [k, b] of store) {
    if (now > b.resetAt) store.delete(k);
  }
}

function maybePrune(): void {
  requestCounter++;
  if (requestCounter % PRUNE_EVERY !== 0) return;
  const now = Date.now();
  pruneExpired(now);
  if (store.size <= MAX_KEYS) return;
  const drop = Math.floor(store.size / 2);
  let i = 0;
  for (const k of store.keys()) {
    store.delete(k);
    i++;
    if (i >= drop) break;
  }
}

export type RateLimitRule = {
  /** Unique key segment, e.g. `lead:ip:1.2.3.4` */
  key: string;
  limit: number;
  windowMs: number;
};

/**
 * Fixed-window counter (in-memory). All rules succeed or none are consumed.
 *
 * **Production (multi-instance):** use Redis / Upstash (`@upstash/ratelimit`) with the same key scheme.
 */
export function tryConsumeAllRateLimits(rules: RateLimitRule[]): boolean {
  if (process.env.PUBLIC_RATE_LIMIT_DISABLED === "1") return true;

  const now = Date.now();
  maybePrune();

  const pending: {
    key: string;
    rule: RateLimitRule;
    mode: "fresh" | "increment";
  }[] = [];

  for (const rule of rules) {
    const b = store.get(rule.key);
    if (!b || now > b.resetAt) {
      pending.push({ key: rule.key, rule, mode: "fresh" });
      continue;
    }
    if (b.count >= rule.limit) {
      return false;
    }
    pending.push({ key: rule.key, rule, mode: "increment" });
  }

  for (const p of pending) {
    if (p.mode === "fresh") {
      store.set(p.key, { count: 1, resetAt: now + p.rule.windowMs });
    } else {
      const b = store.get(p.key);
      if (b) b.count += 1;
    }
  }
  return true;
}

/** Lead intake: per-IP + per canonical phone (after normalization). */
export function assertLeadSubmissionAllowed(
  request: Request,
  normalizedPhone: string,
): Response | null {
  const ip = getClientIp(request);
  const ok = tryConsumeAllRateLimits([
    {
      key: `lead:ip:${ip}`,
      limit: Number(process.env.PUBLIC_LEAD_RATE_IP_LIMIT ?? 24),
      windowMs: Number(process.env.PUBLIC_LEAD_RATE_IP_WINDOW_MS ?? 900_000),
    },
    {
      key: `lead:phone:${normalizedPhone}`,
      limit: Number(process.env.PUBLIC_LEAD_RATE_PHONE_LIMIT ?? 8),
      windowMs: Number(process.env.PUBLIC_LEAD_RATE_PHONE_WINDOW_MS ?? 3_600_000),
    },
  ]);
  if (ok) return null;
  return new Response(
    JSON.stringify({ error: PUBLIC_RATE_LIMIT_MESSAGE_BN }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}

/** Doctor application: per-IP + per normalized phone (stricter). */
export function assertDoctorApplicationAllowed(
  request: Request,
  normalizedPhone: string,
): Response | null {
  const ip = getClientIp(request);
  const ok = tryConsumeAllRateLimits([
    {
      key: `app:ip:${ip}`,
      limit: Number(process.env.PUBLIC_APP_RATE_IP_LIMIT ?? 12),
      windowMs: Number(process.env.PUBLIC_APP_RATE_IP_WINDOW_MS ?? 3_600_000),
    },
    {
      key: `app:phone:${normalizedPhone}`,
      limit: Number(process.env.PUBLIC_APP_RATE_PHONE_LIMIT ?? 4),
      windowMs: Number(process.env.PUBLIC_APP_RATE_PHONE_WINDOW_MS ?? 86_400_000),
    },
  ]);
  if (ok) return null;
  return new Response(
    JSON.stringify({ error: PUBLIC_RATE_LIMIT_MESSAGE_BN }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}
