import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  signAuthToken,
} from "@/lib/auth-token";
import {
  pickDoctorLoginIdentifier,
  pickDoctorLoginPassword,
  type DoctorLoginJsonBody,
} from "@/lib/doctor-login-body";
import { authenticateDoctorWithPassword } from "@/lib/doctor-password-login";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export async function POST(request: Request) {
  let body: DoctorLoginJsonBody;
  try {
    body = (await request.json()) as DoctorLoginJsonBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const identifier = pickDoctorLoginIdentifier(body);
  const password = pickDoctorLoginPassword(body);

  const result = await authenticateDoctorWithPassword(identifier, password);
  if ("error" in result && "status" in result) {
    return NextResponse.json(
      { error: result.error, messageBn: result.messageBn },
      { status: result.status },
    );
  }

  try {
    const token = await signAuthToken(
      { userId: result.userId, role: "DOCTOR" },
      SESSION_MAX_AGE_SEC,
    );
    const res = NextResponse.json({ success: true });
    res.cookies.set(
      AUTH_COOKIE_NAME,
      token,
      authCookieOptions(SESSION_MAX_AGE_SEC),
    );
    return res;
  } catch (err) {
    console.error("POST /api/doctor/login", err);
    return NextResponse.json(
      {
        error: "Login temporarily unavailable.",
        messageBn: "লগইন সাময়িকভাবে অনুপলব্ধ। একটু পরে আবার চেষ্টা করুন।",
      },
      { status: 503 },
    );
  }
}
