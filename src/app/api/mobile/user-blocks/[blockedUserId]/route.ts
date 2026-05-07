import { NextResponse } from "next/server";

import { requireDoctorOrCustomerFromRequest } from "@/lib/mobile-app-user-auth";
import { prisma } from "@/lib/prisma";
import { assertUserBlockWriteAllowed } from "@/lib/public-rate-limit";

type RouteCtx = { params: Promise<{ blockedUserId: string }> };

export async function DELETE(request: Request, ctx: RouteCtx) {
  const auth = await requireDoctorOrCustomerFromRequest(request);
  if (!auth.ok) return auth.response;

  const rl = assertUserBlockWriteAllowed(request, auth.userId);
  if (rl) return rl;

  const blockedUserId = Number.parseInt((await ctx.params).blockedUserId, 10);
  if (!Number.isFinite(blockedUserId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const res = await prisma.userBlock.deleteMany({
    where: { blockerUserId: auth.userId, blockedUserId },
  });
  if (res.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
