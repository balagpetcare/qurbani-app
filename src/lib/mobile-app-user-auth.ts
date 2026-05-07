import { NextResponse } from "next/server";

import { UserRole } from "@/generated/prisma/enums";
import { verifyAuthFromRequest } from "@/lib/auth-token";
import { prisma } from "@/lib/prisma";

/**
 * Optional Bearer session for public feeds (block filtering, future personalization).
 * Returns null for anonymous or invalid token.
 */
export async function getOptionalDoctorOrCustomerUserId(
  request: Request,
): Promise<number | null> {
  const payload = await verifyAuthFromRequest(request);
  if (!payload || (payload.role !== "DOCTOR" && payload.role !== "CUSTOMER")) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, isActive: true },
  });
  if (!user?.isActive) return null;
  if (payload.role === "DOCTOR" && user.role !== UserRole.DOCTOR) return null;
  if (payload.role === "CUSTOMER" && user.role !== UserRole.CUSTOMER) {
    return null;
  }
  return user.id;
}

export type MobileAppUserAuth =
  | { ok: true; userId: number; role: "DOCTOR" | "CUSTOMER" }
  | { ok: false; response: NextResponse };

/**
 * Bearer auth for mobile-only routes that accept **doctor** or **customer** sessions.
 * Ensures JWT role matches DB user role.
 */
export async function requireDoctorOrCustomerFromRequest(
  request: Request,
): Promise<MobileAppUserAuth> {
  const payload = await verifyAuthFromRequest(request);
  if (!payload || (payload.role !== "DOCTOR" && payload.role !== "CUSTOMER")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "UNAUTHORIZED", messageBn: "প্রবেশ করুন।" },
        { status: 401 },
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, isActive: true },
  });

  if (!user?.isActive) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "FORBIDDEN", messageBn: "অ্যাকাউন্ট নিষ্ক্রিয়।" },
        { status: 403 },
      ),
    };
  }

  if (payload.role === "DOCTOR" && user.role !== UserRole.DOCTOR) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "FORBIDDEN", messageBn: "অননুমোদিত।" },
        { status: 403 },
      ),
    };
  }

  if (payload.role === "CUSTOMER" && user.role !== UserRole.CUSTOMER) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "FORBIDDEN", messageBn: "অননুমোদিত।" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, userId: user.id, role: payload.role };
}
