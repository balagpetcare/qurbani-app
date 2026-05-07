/**
 * HMAC-signed auth tokens (Web Crypto) — works in Node route handlers and Edge middleware.
 */
const PREFIX = "v1.";

export const AUTH_COOKIE_NAME = "qurbani_auth";

export type AuthRole = "ADMIN" | "STAFF" | "DOCTOR" | "CUSTOMER";

export type AuthTokenPayload = {
  sub: number;
  role: AuthRole;
  exp: number;
};

const DEV_SESSION_SECRET_PLACEHOLDER = "dev-insecure-session-secret";

function getSecret(): string {
  const raw = process.env.SESSION_SECRET?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!raw) {
      throw new Error("SESSION_SECRET is required in production");
    }
    if (raw === DEV_SESSION_SECRET_PLACEHOLDER) {
      throw new Error(
        "SESSION_SECRET must not use the development placeholder in production; set a strong random secret.",
      );
    }
    return raw.slice(0, 256);
  }

  return (raw || DEV_SESSION_SECRET_PLACEHOLDER).slice(0, 256);
}

function utf8ToBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 =
    typeof btoa !== "undefined"
      ? btoa(bin)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToUtf8(b64url: string): string {
  const pad = 4 - (b64url.length % 4 || 4);
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad % 4);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(b64, "base64").toString("utf8");
  }
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function hmacSha256B64Url(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 =
    typeof btoa !== "undefined"
      ? btoa(bin)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signAuthToken(
  data: { userId: number; role: AuthRole },
  maxAgeSec: number,
): Promise<string> {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + maxAgeSec;
  const body: AuthTokenPayload = { sub: data.userId, role: data.role, exp };
  const json = JSON.stringify(body);
  const payloadB64 = utf8ToBase64Url(json);
  const sig = await hmacSha256B64Url(payloadB64, secret);
  return `${PREFIX}${payloadB64}.${sig}`;
}

/**
 * Verify auth from `Authorization: Bearer <token>` first, then `qurbani_auth` cookie.
 * Edge-safe (no DB) — use in middleware and route handlers before role checks.
 */
export async function verifyAuthFromRequest(
  request: Request,
): Promise<AuthTokenPayload | null> {
  const authz = request.headers.get("authorization");
  if (authz) {
    const m = /^\s*Bearer\s+(\S+)/i.exec(authz);
    const bearerToken = m?.[1]?.trim();
    if (bearerToken) {
      const fromBearer = await verifyAuthToken(bearerToken);
      if (fromBearer) return fromBearer;
    }
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const cookieMatch = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]+)`),
  );
  const raw = cookieMatch?.[1];
  if (!raw) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    value = raw;
  }
  return verifyAuthToken(value);
}

export async function verifyAuthToken(
  token: string | undefined,
): Promise<AuthTokenPayload | null> {
  if (!token?.startsWith(PREFIX)) return null;
  const rest = token.slice(PREFIX.length);
  const lastDot = rest.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const payloadB64 = rest.slice(0, lastDot);
  const sig = rest.slice(lastDot + 1);
  const secret = getSecret();
  const expected = await hmacSha256B64Url(payloadB64, secret);
  if (sig.length !== expected.length) return null;
  let ok = true;
  for (let i = 0; i < sig.length; i++) {
    if (sig.charCodeAt(i) !== expected.charCodeAt(i)) ok = false;
  }
  if (!ok) return null;

  let parsed: AuthTokenPayload;
  try {
    parsed = JSON.parse(base64UrlToUtf8(payloadB64)) as AuthTokenPayload;
  } catch {
    return null;
  }

  if (
    typeof parsed.sub !== "number" ||
    (parsed.role !== "ADMIN" &&
      parsed.role !== "STAFF" &&
      parsed.role !== "DOCTOR" &&
      parsed.role !== "CUSTOMER") ||
    typeof parsed.exp !== "number"
  ) {
    return null;
  }

  if (parsed.exp < Math.floor(Date.now() / 1000)) return null;

  return parsed;
}

export function authCookieOptions(maxAgeSec: number): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
  };
}
