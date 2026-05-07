import { createHmac, timingSafeEqual } from "node:crypto";

const DEV_SESSION_SECRET_PLACEHOLDER = "dev-insecure-session-secret";

function getSecret(): string {
  const raw = process.env.SESSION_SECRET?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (!raw) {
      throw new Error("SESSION_SECRET is required in production");
    }
    if (raw === DEV_SESSION_SECRET_PLACEHOLDER) {
      throw new Error("SESSION_SECRET must not use the development placeholder in production");
    }
    return raw.slice(0, 256);
  }

  return (raw || DEV_SESSION_SECRET_PLACEHOLDER).slice(0, 256);
}

export type MobileUploadIntentPayload = {
  /** Unix seconds */
  exp: number;
  /** Declared MIME (lowercase) */
  ct: string;
  /** Max bytes allowed for this upload */
  max: number;
  nonce: string;
};

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = 4 - (s.length % 4 || 4);
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad % 4);
  return Buffer.from(b64, "base64");
}

export function signMobileUploadIntent(payload: MobileUploadIntentPayload): string {
  const secret = getSecret();
  const body = JSON.stringify(payload);
  const bodyB64 = b64url(Buffer.from(body, "utf8"));
  const sig = createHmac("sha256", secret).update(bodyB64).digest();
  const sigB64 = b64url(sig);
  return `${bodyB64}.${sigB64}`;
}

export function verifyMobileUploadIntent(token: string): MobileUploadIntentPayload | null {
  try {
    const secret = getSecret();
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [bodyB64, sigB64] = parts;
    if (!bodyB64 || !sigB64) return null;
    const expected = createHmac("sha256", secret).update(bodyB64).digest();
    const got = b64urlDecode(sigB64);
    if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
    const json = b64urlDecode(bodyB64).toString("utf8");
    const p = JSON.parse(json) as MobileUploadIntentPayload;
    if (typeof p.exp !== "number" || typeof p.ct !== "string" || typeof p.max !== "number") return null;
    if (Math.floor(Date.now() / 1000) > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}
