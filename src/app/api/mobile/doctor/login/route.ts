import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  signAuthToken,
} from "@/lib/auth-token";
import { authenticateDoctorWithPassword } from "@/lib/doctor-password-login";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

type Body = {
  identifier?: unknown;
  password?: unknown;
};

/**
 * Mobile / native clients: returns Bearer token JSON (also sets httpOnly cookie for parity).
 * Flutter stores `accessToken` in secure storage and sends `Authorization: Bearer …`.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const identifier =
    typeof body.identifier === "string" ? body.identifier.trim() : "";
  const password =
    typeof body.password === "string" ? body.password : "";

  const result = await authenticateDoctorWithPassword(identifier, password);
  if ("error" in result && "status" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  try {
    const token = await signAuthToken(
      { userId: result.userId, role: "DOCTOR" },
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
  } catch (err) {
    console.error("POST /api/mobile/doctor/login", err);
    return NextResponse.json(
      { error: "Login temporarily unavailable." },
      { status: 503 },
    );
  }
}
