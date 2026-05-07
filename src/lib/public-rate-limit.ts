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

/** Anonymous mobile media upload-url / ingest: per-IP only. */
export function assertMobileMediaUploadAllowed(request: Request): Response | null {
  const ip = getClientIp(request);
  const ok = tryConsumeAllRateLimits([
    {
      key: `media:ip:${ip}`,
      limit: Number(process.env.PUBLIC_MEDIA_UPLOAD_RATE_IP_LIMIT ?? 40),
      windowMs: Number(process.env.PUBLIC_MEDIA_UPLOAD_RATE_IP_WINDOW_MS ?? 3_600_000),
    },
  ]);
  if (ok) return null;
  return new Response(
    JSON.stringify({ error: PUBLIC_RATE_LIMIT_MESSAGE_BN }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}

/** POST /api/mobile/otp/start — per IP + per normalized phone. */
export function assertMobileOtpStartAllowed(
  request: Request,
  normalizedPhone: string,
): Response | null {
  const ip = getClientIp(request);
  const ok = tryConsumeAllRateLimits([
    {
      key: `otp:start:ip:${ip}`,
      limit: Number(process.env.PUBLIC_OTP_START_RATE_IP_LIMIT ?? 40),
      windowMs: Number(process.env.PUBLIC_OTP_START_RATE_IP_WINDOW_MS ?? 3_600_000),
    },
    {
      key: `otp:start:phone:${normalizedPhone}`,
      limit: Number(process.env.PUBLIC_OTP_START_RATE_PHONE_LIMIT ?? 6),
      windowMs: Number(process.env.PUBLIC_OTP_START_RATE_PHONE_WINDOW_MS ?? 3_600_000),
    },
  ]);
  if (ok) return null;
  return new Response(
    JSON.stringify({ error: PUBLIC_RATE_LIMIT_MESSAGE_BN }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}

/** POST /api/mobile/otp/verify — per IP + per phone (tighter than start). */
export function assertMobileOtpVerifyAllowed(
  request: Request,
  normalizedPhone: string,
): Response | null {
  const ip = getClientIp(request);
  const ok = tryConsumeAllRateLimits([
    {
      key: `otp:verify:ip:${ip}`,
      limit: Number(process.env.PUBLIC_OTP_VERIFY_RATE_IP_LIMIT ?? 80),
      windowMs: Number(process.env.PUBLIC_OTP_VERIFY_RATE_IP_WINDOW_MS ?? 3_600_000),
    },
    {
      key: `otp:verify:phone:${normalizedPhone}`,
      limit: Number(process.env.PUBLIC_OTP_VERIFY_RATE_PHONE_LIMIT ?? 20),
      windowMs: Number(process.env.PUBLIC_OTP_VERIFY_RATE_PHONE_WINDOW_MS ?? 3_600_000),
    },
  ]);
  if (ok) return null;
  return new Response(
    JSON.stringify({ error: PUBLIC_RATE_LIMIT_MESSAGE_BN }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}

/** GET public tutorial list/detail — per client IP. */
export function assertPublicTutorialReadAllowed(request: Request): Response | null {
  const ip = getClientIp(request);
  const ok = tryConsumeAllRateLimits([
    {
      key: `tutorials:read:ip:${ip}`,
      limit: Number(process.env.PUBLIC_TUTORIAL_READ_RATE_IP_LIMIT ?? 120),
      windowMs: Number(process.env.PUBLIC_TUTORIAL_READ_RATE_IP_WINDOW_MS ?? 3_600_000),
    },
  ]);
  if (ok) return null;
  return new Response(
    JSON.stringify({ error: PUBLIC_RATE_LIMIT_MESSAGE_BN }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}

/** Doctor tutorial writes (create / patch / submit). */
export function assertDoctorTutorialWriteAllowed(
  request: Request,
  doctorUserId: number,
): Response | null {
  const ip = getClientIp(request);
  const ok = tryConsumeAllRateLimits([
    {
      key: `tutorials:write:doctor:${doctorUserId}`,
      limit: Number(process.env.DOCTOR_TUTORIAL_WRITE_RATE_USER_LIMIT ?? 60),
      windowMs: Number(process.env.DOCTOR_TUTORIAL_WRITE_RATE_USER_WINDOW_MS ?? 3_600_000),
    },
    {
      key: `tutorials:write:ip:${ip}`,
      limit: Number(process.env.DOCTOR_TUTORIAL_WRITE_RATE_IP_LIMIT ?? 120),
      windowMs: Number(process.env.DOCTOR_TUTORIAL_WRITE_RATE_IP_WINDOW_MS ?? 3_600_000),
    },
  ]);
  if (ok) return null;
  return new Response(
    JSON.stringify({ error: PUBLIC_RATE_LIMIT_MESSAGE_BN }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}

/** Authenticated content reports — per user + IP. */
export function assertContentReportAllowed(
  request: Request,
  reporterUserId: number,
): Response | null {
  const ip = getClientIp(request);
  const ok = tryConsumeAllRateLimits([
    {
      key: `report:user:${reporterUserId}`,
      limit: Number(process.env.CONTENT_REPORT_RATE_USER_LIMIT ?? 20),
      windowMs: Number(process.env.CONTENT_REPORT_RATE_USER_WINDOW_MS ?? 3_600_000),
    },
    {
      key: `report:ip:${ip}`,
      limit: Number(process.env.CONTENT_REPORT_RATE_IP_LIMIT ?? 40),
      windowMs: Number(process.env.CONTENT_REPORT_RATE_IP_WINDOW_MS ?? 3_600_000),
    },
  ]);
  if (ok) return null;
  return new Response(
    JSON.stringify({ error: PUBLIC_RATE_LIMIT_MESSAGE_BN }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}

/** User block create/delete — per user + IP. */
export function assertUserBlockWriteAllowed(
  request: Request,
  blockerUserId: number,
): Response | null {
  const ip = getClientIp(request);
  const ok = tryConsumeAllRateLimits([
    {
      key: `userblock:user:${blockerUserId}`,
      limit: Number(process.env.USER_BLOCK_RATE_USER_LIMIT ?? 40),
      windowMs: Number(process.env.USER_BLOCK_RATE_USER_WINDOW_MS ?? 3_600_000),
    },
    {
      key: `userblock:ip:${ip}`,
      limit: Number(process.env.USER_BLOCK_RATE_IP_LIMIT ?? 80),
      windowMs: Number(process.env.USER_BLOCK_RATE_IP_WINDOW_MS ?? 3_600_000),
    },
  ]);
  if (ok) return null;
  return new Response(
    JSON.stringify({ error: PUBLIC_RATE_LIMIT_MESSAGE_BN }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}

/** GET public case history list/detail — per client IP. */
export function assertPublicCaseHistoryReadAllowed(request: Request): Response | null {
  const ip = getClientIp(request);
  const ok = tryConsumeAllRateLimits([
    {
      key: `casehistories:read:ip:${ip}`,
      limit: Number(process.env.PUBLIC_CASE_HISTORY_READ_RATE_IP_LIMIT ?? 120),
      windowMs: Number(process.env.PUBLIC_CASE_HISTORY_READ_RATE_IP_WINDOW_MS ?? 3_600_000),
    },
  ]);
  if (ok) return null;
  return new Response(
    JSON.stringify({ error: PUBLIC_RATE_LIMIT_MESSAGE_BN }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}

/** Doctor public case history submit from lead. */
export function assertDoctorCaseHistoryWriteAllowed(
  request: Request,
  doctorUserId: number,
): Response | null {
  const ip = getClientIp(request);
  const ok = tryConsumeAllRateLimits([
    {
      key: `casehistories:write:doctor:${doctorUserId}`,
      limit: Number(process.env.DOCTOR_CASE_HISTORY_WRITE_RATE_USER_LIMIT ?? 40),
      windowMs: Number(process.env.DOCTOR_CASE_HISTORY_WRITE_RATE_USER_WINDOW_MS ?? 3_600_000),
    },
    {
      key: `casehistories:write:ip:${ip}`,
      limit: Number(process.env.DOCTOR_CASE_HISTORY_WRITE_RATE_IP_LIMIT ?? 80),
      windowMs: Number(process.env.DOCTOR_CASE_HISTORY_WRITE_RATE_IP_WINDOW_MS ?? 3_600_000),
    },
  ]);
  if (ok) return null;
  return new Response(
    JSON.stringify({ error: PUBLIC_RATE_LIMIT_MESSAGE_BN }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}

/** POST /api/mobile/auth/social — per client IP. */
export function assertMobileSocialAuthAllowed(request: Request): Response | null {
  const ip = getClientIp(request);
  const ok = tryConsumeAllRateLimits([
    {
      key: `social:auth:ip:${ip}`,
      limit: Number(process.env.MOBILE_SOCIAL_AUTH_RATE_IP_LIMIT ?? 40),
      windowMs: Number(process.env.MOBILE_SOCIAL_AUTH_RATE_IP_WINDOW_MS ?? 3_600_000),
    },
  ]);
  if (ok) return null;
  return new Response(
    JSON.stringify({ error: PUBLIC_RATE_LIMIT_MESSAGE_BN }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}
