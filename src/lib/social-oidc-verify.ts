/**
 * OAuth token verification for mobile customer social login.
 *
 * - **Google**: `id_token` validated via Google tokeninfo (allowed audiences from env).
 * - **Facebook**: short-lived **user** access token validated with `debug_token` (app secret in env only).
 * - **Apple**: `identityToken` JWT verified against Apple JWKS (`jose`), audience from env.
 *
 * Long-lived refresh tokens are never stored; clients send only what they need per request.
 */
import * as jose from "jose";

export type VerifiedSocialProfile = {
  subject: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim().toLowerCase();
  return t.length ? t : null;
}

function parseGoogleAudiences(): string[] {
  const raw =
    process.env.GOOGLE_OAUTH_CLIENT_IDS?.trim() || process.env.GOOGLE_WEB_CLIENT_ID?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Verifies Google ID token using Google's tokeninfo endpoint (no service account).
 * Configure allowed audiences via `GOOGLE_OAUTH_CLIENT_IDS` (comma-separated) or `GOOGLE_WEB_CLIENT_ID`.
 */
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedSocialProfile | null> {
  const audiences = parseGoogleAudiences();
  if (!audiences.length) return null;

  const url = new URL("https://oauth2.googleapis.com/v3/tokeninfo");
  url.searchParams.set("id_token", idToken);
  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  if (!res.ok) return null;

  const j = (await res.json()) as Record<string, unknown>;
  const sub = typeof j.sub === "string" ? j.sub : null;
  const aud = typeof j.aud === "string" ? j.aud : null;
  const email = normalizeEmail(typeof j.email === "string" ? j.email : null);
  const ev =
    j.email_verified === true ||
    j.email_verified === "true" ||
    j.email_verified === "True";
  const name = typeof j.name === "string" ? j.name.trim() || null : null;

  if (!sub || !aud || !audiences.includes(aud)) return null;
  if (!email || !ev) return null;

  return { subject: sub, email, emailVerified: true, name };
}

/**
 * Verifies a Facebook user access token via `debug_token` (app secret stays in env only).
 */
export async function verifyFacebookUserAccessToken(
  userAccessToken: string,
): Promise<VerifiedSocialProfile | null> {
  const appId = process.env.FACEBOOK_APP_ID?.trim();
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;

  const appAccess = `${appId}|${appSecret}`;
  const url = new URL("https://graph.facebook.com/v19.0/debug_token");
  url.searchParams.set("input_token", userAccessToken);
  url.searchParams.set("access_token", appAccess);

  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  if (!res.ok) return null;

  const body = (await res.json()) as {
    data?: {
      is_valid?: boolean;
      user_id?: string;
      app_id?: string;
    };
  };
  const d = body.data;
  if (!d?.is_valid || !d.user_id) return null;
  if (d.app_id && d.app_id !== appId) return null;

  const subject = String(d.user_id);

  const meUrl = new URL("https://graph.facebook.com/v19.0/me");
  meUrl.searchParams.set("fields", "id,name,email");
  meUrl.searchParams.set("access_token", userAccessToken);
  const meRes = await fetch(meUrl.toString(), { cache: "no-store" });
  if (!meRes.ok) {
    return { subject, email: null, emailVerified: false, name: null };
  }
  const me = (await meRes.json()) as { email?: string; name?: string };
  const email = normalizeEmail(me.email ?? null);
  return {
    subject,
    email,
    emailVerified: Boolean(email),
    name: typeof me.name === "string" ? me.name.trim() || null : null,
  };
}

function parseAppleAudiences(): string[] {
  const raw = process.env.APPLE_CLIENT_ID?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Whether Google id_token verification can run (allowed audiences set). */
export function isGoogleOAuthConfigured(): boolean {
  return parseGoogleAudiences().length > 0;
}

/** Whether Facebook user-token verification can run (public app id + **server** secret in env). */
export function isFacebookOAuthConfigured(): boolean {
  const appId = process.env.FACEBOOK_APP_ID?.trim();
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim();
  return Boolean(appId && appSecret);
}

/** Whether Apple identity token verification can run (`APPLE_CLIENT_ID` non-empty). */
export function isAppleOAuthConfigured(): boolean {
  return parseAppleAudiences().length > 0;
}

/** Verifies Apple `identityToken` (JWT) via Apple's JWKS; optional comma-separated `APPLE_CLIENT_ID` audiences. */
export async function verifyAppleIdToken(idToken: string): Promise<VerifiedSocialProfile | null> {
  const audiences = parseAppleAudiences();
  if (!audiences.length) return null;

  const JWKS = jose.createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
  const { payload } = await jose.jwtVerify(idToken, JWKS, {
    issuer: "https://appleid.apple.com",
    audience: audiences.length === 1 ? audiences[0]! : audiences,
  });

  const sub = typeof payload.sub === "string" ? payload.sub : null;
  if (!sub) return null;

  const email = normalizeEmail(
    typeof payload.email === "string" ? payload.email : null,
  );
  const emailVerified =
    payload.email_verified === true ||
    payload.email_verified === "true" ||
    payload.email_verified === 1;

  return {
    subject: sub,
    email,
    emailVerified: Boolean(emailVerified && email),
    name: null,
  };
}
