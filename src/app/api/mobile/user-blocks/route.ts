import { NextResponse } from "next/server";

import { requireDoctorOrCustomerFromRequest } from "@/lib/mobile-app-user-auth";
import { prisma } from "@/lib/prisma";
import { assertUserBlockWriteAllowed } from "@/lib/public-rate-limit";

export async function POST(request: Request) {
  const auth = await requireDoctorOrCustomerFromRequest(request);
  if (!auth.ok) return auth.response;

  const rl = assertUserBlockWriteAllowed(request, auth.userId);
  if (rl) return rl;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const blockedUserIdRaw =
    typeof body === "object" && body !== null
      ? (body as { blockedUserId?: unknown }).blockedUserId
      : undefined;
  const blockedUserId =
    typeof blockedUserIdRaw === "number"
      ? blockedUserIdRaw
      : Number.parseInt(String(blockedUserIdRaw), 10);
  if (!Number.isFinite(blockedUserId)) {
    return NextResponse.json({ error: "Invalid blockedUserId" }, { status: 400 });
  }
  if (blockedUserId === auth.userId) {
    return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: blockedUserId },
    select: { id: true, isActive: true },
  });
  if (!target?.isActive) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await prisma.userBlock.findUnique({
    where: {
      blockerUserId_blockedUserId: {
        blockerUserId: auth.userId,
        blockedUserId,
      },
    },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Already blocked" }, { status: 409 });
  }

  const block = await prisma.userBlock.create({
    data: {
      blockerUserId: auth.userId,
      blockedUserId,
    },
    select: { id: true, blockedUserId: true, createdAt: true },
  });
  return NextResponse.json({ block }, { status: 201 });
}
