import { NextResponse } from "next/server";

import { SocialAuthProvider } from "@/generated/prisma/enums";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  signAuthToken,
} from "@/lib/auth-token";
import { exchangeCustomerSocialLogin } from "@/lib/mobile-social-auth-service";
import {
  SOCIAL_GENERIC_ERROR_BN,
  SOCIAL_INVALID_BODY_BN,
} from "@/lib/mobile-social-auth-messages";
import { assertMobileSocialAuthAllowed } from "@/lib/public-rate-limit";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

function parseProvider(raw: unknown): SocialAuthProvider | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toUpperCase();
  if (v === "GOOGLE") return SocialAuthProvider.GOOGLE;
  if (v === "FACEBOOK") return SocialAuthProvider.FACEBOOK;
  if (v === "APPLE") return SocialAuthProvider.APPLE;
  return null;
}

export async function POST(request: Request) {
  const rl = assertMobileSocialAuthAllowed(request);
  if (rl) return rl;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", messageBn: SOCIAL_INVALID_BODY_BN },
      { status: 400 },
    );
  }

  const provider = parseProvider(body.provider);
  if (!provider) {
    return NextResponse.json(
      { error: "INVALID_PROVIDER", messageBn: SOCIAL_INVALID_BODY_BN },
      { status: 400 },
    );
  }

  const idToken = typeof body.idToken === "string" ? body.idToken : undefined;
  const accessToken =
    typeof body.accessToken === "string" ? body.accessToken : undefined;

  const out = await exchangeCustomerSocialLogin({ provider, idToken, accessToken });
  if (!out.ok) {
    return NextResponse.json(
      { error: out.code, messageBn: out.messageBn },
      { status: out.status },
    );
  }

  try {
    const token = await signAuthToken(
      { userId: out.userId, role: "CUSTOMER" },
      SESSION_MAX_AGE_SEC,
    );
    const res = NextResponse.json({
      success: true,
      accessToken: token,
      tokenType: "Bearer",
      expiresInSec: SESSION_MAX_AGE_SEC,
    });
    res.cookies.set(
      AUTH_COOKIE_NAME,
      token,
      authCookieOptions(SESSION_MAX_AGE_SEC),
    );
    return res;
  } catch (e) {
    console.error("POST /api/mobile/auth/social sign", e);
    return NextResponse.json(
      { error: "SERVER_ERROR", messageBn: SOCIAL_GENERIC_ERROR_BN },
      { status: 503 },
    );
  }
}
