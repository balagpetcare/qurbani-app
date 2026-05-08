import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  signAuthToken,
} from "@/lib/auth-token";
import { mobileApiErrorBody } from "@/lib/api-json-response";
import {
  pickDoctorLoginIdentifier,
  pickDoctorLoginPassword,
  type DoctorLoginJsonBody,
} from "@/lib/doctor-login-body";
import { authenticateDoctorWithPassword } from "@/lib/doctor-password-login";
import { prisma } from "@/lib/prisma";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

/**
 * Mobile / native clients: returns Bearer token JSON (also sets httpOnly cookie for parity).
 */
export async function POST(request: Request) {
  let body: DoctorLoginJsonBody;
  try {
    body = (await request.json()) as DoctorLoginJsonBody;
  } catch {
    return NextResponse.json(
      mobileApiErrorBody(
        "INVALID_JSON",
        "অনুরোধের বিন্যাস সঠিক নয়। JSON দিন।",
        "Invalid JSON body",
      ),
      { status: 400 },
    );
  }

  const identifier = pickDoctorLoginIdentifier(body);
  const password = pickDoctorLoginPassword(body);

  const result = await authenticateDoctorWithPassword(identifier, password);
  if ("error" in result && "status" in result) {
    return NextResponse.json(
      mobileApiErrorBody(result.error, result.messageBn, result.error),
      { status: result.status },
    );
  }

  try {
    const token = await signAuthToken(
      { userId: result.userId, role: "DOCTOR" },
      SESSION_MAX_AGE_SEC,
    );

    const profile = await prisma.user.findUnique({
      where: { id: result.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isActive: true,
      },
    });

    const res = NextResponse.json({
      ok: true,
      success: true,
      accessToken: token,
      tokenType: "Bearer",
      expiresInSec: SESSION_MAX_AGE_SEC,
      doctor: profile
        ? {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            isActive: profile.isActive,
          }
        : null,
    });
    res.cookies.set(
      AUTH_COOKIE_NAME,
      token,
      authCookieOptions(SESSION_MAX_AGE_SEC),
    );
    return res;
  } catch (err) {
    console.error("POST /api/mobile/doctor/login", err);
    return NextResponse.json(
      mobileApiErrorBody(
        "SERVICE_UNAVAILABLE",
        "লগইন সাময়িকভাবে অনুপলব্ধ। একটু পরে আবার চেষ্টা করুন।",
        "Login temporarily unavailable.",
      ),
      { status: 503 },
    );
  }
}
