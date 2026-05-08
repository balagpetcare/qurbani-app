import { NextResponse } from "next/server";

import { SocialAuthProvider } from "@/generated/prisma/enums";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  signAuthToken,
} from "@/lib/auth-token";
import { mobileApiErrorBody } from "@/lib/api-json-response";
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

export type ForcedSocialProvider = "GOOGLE" | "FACEBOOK" | "APPLE";

/**
 * Shared POST handler for `/api/mobile/auth/social` and provider-specific aliases.
 */
export async function postMobileCustomerSocial(
  request: Request,
  forced: ForcedSocialProvider | null,
): Promise<Response> {
  const rl = assertMobileSocialAuthAllowed(request);
  if (rl) return rl;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(mobileApiErrorBody("INVALID_JSON", SOCIAL_INVALID_BODY_BN), {
      status: 400,
    });
  }

  const provider =
    forced != null ? parseProvider(forced) : parseProvider(body.provider);
  if (!provider) {
    return NextResponse.json(mobileApiErrorBody("INVALID_PROVIDER", SOCIAL_INVALID_BODY_BN), {
      status: 400,
    });
  }

  const idToken = typeof body.idToken === "string" ? body.idToken : undefined;
  const accessToken =
    typeof body.accessToken === "string" ? body.accessToken : undefined;

  const out = await exchangeCustomerSocialLogin({ provider, idToken, accessToken });
  if (!out.ok) {
    return NextResponse.json(mobileApiErrorBody(out.code, out.messageBn), {
      status: out.status,
    });
  }

  try {
    const token = await signAuthToken(
      { userId: out.userId, role: "CUSTOMER" },
      SESSION_MAX_AGE_SEC,
    );
    const res = NextResponse.json({
      ok: true,
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
    console.error("mobileCustomerSocial sign", e);
    return NextResponse.json(mobileApiErrorBody("SERVER_ERROR", SOCIAL_GENERIC_ERROR_BN), {
      status: 503,
    });
  }
}
