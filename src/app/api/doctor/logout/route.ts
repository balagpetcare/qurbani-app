import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/auth-token";

export async function GET(request: Request) {
  const login = new URL("/doctor/login", request.url);
  const res = NextResponse.redirect(login);
  res.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
