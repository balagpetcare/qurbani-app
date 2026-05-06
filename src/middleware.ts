import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";

const ADMIN_LOGIN = "/admin/login";
const DOCTOR_LOGIN = "/doctor/login";

function isAdminPortalRole(
  role: import("@/lib/auth-token").AuthTokenPayload["role"] | undefined,
): boolean {
  return role === "ADMIN" || role === "STAFF";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/logout" ||
    pathname === "/api/doctor/login" ||
    pathname === "/api/doctor/logout"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const payload = await verifyAuthToken(token);

  if (pathname.startsWith("/admin")) {
    if (pathname === ADMIN_LOGIN) {
      return NextResponse.next();
    }
    if (!payload || !isAdminPortalRole(payload.role)) {
      const login = new URL(ADMIN_LOGIN, request.url);
      login.searchParams.set("from", pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    if (!payload || !isAdminPortalRole(payload.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/doctor")) {
    if (pathname === DOCTOR_LOGIN || pathname === "/doctor/apply") {
      return NextResponse.next();
    }
    if (!payload || payload.role !== "DOCTOR") {
      const login = new URL(DOCTOR_LOGIN, request.url);
      login.searchParams.set("from", pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/doctor")) {
    if (!payload || payload.role !== "DOCTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/doctor",
    "/doctor/:path*",
    "/api/doctor/:path*",
  ],
};
