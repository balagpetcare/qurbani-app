import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { UserRole } from "@/generated/prisma/enums";
import type { AuthRole } from "@/lib/auth-token";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  signAuthToken,
} from "@/lib/auth-token";
import { prisma } from "@/lib/prisma";
import { normalizeBangladeshPhone } from "@/lib/phone";

type Body = {
  identifier?: unknown;
  username?: unknown;
  password?: unknown;
};

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

function userRoleToAdminAuthRole(role: UserRole): AuthRole | null {
  if (role === UserRole.ADMIN) return "ADMIN";
  if (role === UserRole.STAFF) return "STAFF";
  return null;
}

async function buildSessionResponse(
  userId: number,
  role: AuthRole,
): Promise<NextResponse> {
  const token = await signAuthToken(
    { userId, role },
    SESSION_MAX_AGE_SEC,
  );
  const res = NextResponse.json({ success: true });
  res.cookies.set(
    AUTH_COOKIE_NAME,
    token,
    authCookieOptions(SESSION_MAX_AGE_SEC),
  );
  return res;
}

async function findAdminOrStaffByIdentifier(identifier: string) {
  const trimmed = identifier.trim();

  if (trimmed.includes("@")) {
    return prisma.user.findFirst({
      where: {
        role: { in: [UserRole.ADMIN, UserRole.STAFF] },
        isActive: true,
        email: {
          equals: trimmed.toLowerCase(),
          mode: "insensitive",
        },
      },
      select: { id: true, passwordHash: true, role: true },
    });
  }

  const phoneNorm = normalizeBangladeshPhone(trimmed);
  const or: { phone: string }[] = [];
  if (phoneNorm) {
    or.push({ phone: phoneNorm });
    or.push({ phone: `880${phoneNorm.slice(1)}` });
  }
  or.push({ phone: trimmed });

  return prisma.user.findFirst({
    where: {
      role: { in: [UserRole.ADMIN, UserRole.STAFF] },
      isActive: true,
      OR: or,
    },
    select: { id: true, passwordHash: true, role: true },
  });
}

function tryEnvLogin(identifier: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME ?? "";
  const expectedPass = process.env.ADMIN_PASSWORD ?? "";
  if (!expectedUser || !expectedPass) return false;
  return identifier === expectedUser && password === expectedPass;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawIdentifier =
    typeof body.identifier === "string"
      ? body.identifier
      : typeof body.username === "string"
        ? body.username
        : "";
  const identifier = rawIdentifier.trim();
  const password =
    typeof body.password === "string" ? body.password : "";

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Email or phone and password are required." },
      { status: 400 },
    );
  }

  try {
    const user = await findAdminOrStaffByIdentifier(identifier);

    if (user?.passwordHash) {
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (ok) {
        const authRole = userRoleToAdminAuthRole(user.role);
        if (!authRole) {
          return NextResponse.json(
            { error: "This account cannot use the admin portal." },
            { status: 403 },
          );
        }
        return await buildSessionResponse(user.id, authRole);
      }
      return NextResponse.json(
        { error: "Invalid email/phone or password." },
        { status: 401 },
      );
    }

    if (user && !user.passwordHash) {
      if (tryEnvLogin(identifier, password)) {
        const authRole = userRoleToAdminAuthRole(user.role);
        if (!authRole) {
          return NextResponse.json(
            { error: "This account cannot use the admin portal." },
            { status: 403 },
          );
        }
        return await buildSessionResponse(user.id, authRole);
      }
      const hasEnvFallback =
        !!process.env.ADMIN_USERNAME?.trim() &&
        !!process.env.ADMIN_PASSWORD?.trim();
      if (!hasEnvFallback) {
        return NextResponse.json(
          {
            error:
              "This admin account has no password in the database. Run `npm run db:seed` with ADMIN_SEED_PASSWORD set, or configure ADMIN_USERNAME / ADMIN_PASSWORD for emergency access.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: "Invalid email/phone or password." },
        { status: 401 },
      );
    }

    if (tryEnvLogin(identifier, password)) {
      const fallbackAdmin = await prisma.user.findFirst({
        where: { role: UserRole.ADMIN, isActive: true },
        orderBy: { id: "asc" },
        select: { id: true },
      });
      if (fallbackAdmin) {
        return await buildSessionResponse(fallbackAdmin.id, "ADMIN");
      }
      return NextResponse.json(
        {
          error:
            "Env login matched but no ADMIN user exists in the database. Run db:seed.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Invalid email/phone or password." },
      { status: 401 },
    );
  } catch (err) {
    console.error("POST /api/admin/login", err);
    return NextResponse.json(
      { error: "Login temporarily unavailable. Try again later." },
      { status: 503 },
    );
  }
}
