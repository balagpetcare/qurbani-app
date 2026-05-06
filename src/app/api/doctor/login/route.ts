import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { UserRole } from "@/generated/prisma/enums";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  signAuthToken,
} from "@/lib/auth-token";
import { prisma } from "@/lib/prisma";
import { normalizeBangladeshPhone } from "@/lib/phone";

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

type Body = {
  identifier?: unknown;
  password?: unknown;
};

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

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Email or phone and password are required." },
      { status: 400 },
    );
  }

  try {
    let user:
      | { id: number; passwordHash: string | null; role: UserRole }
      | null = null;

    if (identifier.includes("@")) {
      user = await prisma.user.findFirst({
        where: {
          email: { equals: identifier.toLowerCase(), mode: "insensitive" },
          role: UserRole.DOCTOR,
          isActive: true,
        },
        select: { id: true, passwordHash: true, role: true },
      });
    } else {
      const phoneNorm = normalizeBangladeshPhone(identifier);
      const or: { phone: string }[] = [];
      if (phoneNorm) {
        or.push({ phone: phoneNorm });
        or.push({ phone: `880${phoneNorm.slice(1)}` });
      }
      or.push({ phone: identifier });
      user = await prisma.user.findFirst({
        where: {
          role: UserRole.DOCTOR,
          isActive: true,
          OR: or,
        },
        select: { id: true, passwordHash: true, role: true },
      });
    }

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email/phone or password." },
        { status: 401 },
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email/phone or password." },
        { status: 401 },
      );
    }

    const token = await signAuthToken(
      { userId: user.id, role: "DOCTOR" },
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
      { error: "Login temporarily unavailable." },
      { status: 503 },
    );
  }
}
