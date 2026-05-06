import { NextResponse } from "next/server";

import { UserRole } from "@/generated/prisma/enums";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth-token";
import { prisma } from "@/lib/prisma";

export async function getAuthFromCookies(
  cookieHeader: string | null,
): Promise<import("@/lib/auth-token").AuthTokenPayload | null> {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`));
  const raw = m?.[1];
  if (!raw) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    value = raw;
  }
  return verifyAuthToken(value);
}

export async function requireAdminFromRequest(request: Request) {
  const payload = await getAuthFromCookies(request.headers.get("cookie"));
  if (!payload || (payload.role !== "ADMIN" && payload.role !== "STAFF")) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, isActive: true },
  });
  if (
    !user ||
    !user.isActive ||
    (user.role !== UserRole.ADMIN && user.role !== UserRole.STAFF)
  ) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, userId: user.id };
}

/** Settings routes: MAIN ADMIN only (not STAFF). */
export async function requireMainAdminFromRequest(request: Request) {
  const base = await requireAdminFromRequest(request);
  if (!base.ok) return base;
  const user = await prisma.user.findUnique({
    where: { id: base.userId },
    select: { role: true },
  });
  if (!user || user.role !== UserRole.ADMIN) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true as const, userId: base.userId };
}

export async function requireDoctorFromRequest(request: Request) {
  const payload = await getAuthFromCookies(request.headers.get("cookie"));
  if (!payload || payload.role !== "DOCTOR") {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      role: true,
      isActive: true,
      name: true,
      email: true,
      phone: true,
    },
  });
  if (!user || user.role !== UserRole.DOCTOR || !user.isActive) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, user: user };
}
