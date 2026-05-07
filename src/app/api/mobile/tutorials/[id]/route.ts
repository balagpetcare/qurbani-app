import { NextResponse } from "next/server";

import { TutorialStatus } from "@/generated/prisma/enums";
import { getOptionalDoctorOrCustomerUserId } from "@/lib/mobile-app-user-auth";
import { prisma } from "@/lib/prisma";
import { assertPublicTutorialReadAllowed } from "@/lib/public-rate-limit";
import { toPublicTutorialDetail } from "@/lib/tutorial-public-dto";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: RouteCtx) {
  const rl = assertPublicTutorialReadAllowed(request);
  if (rl) return rl;

  const id = Number.parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const viewerId = await getOptionalDoctorOrCustomerUserId(request);

  const tutorial = await prisma.tutorial.findFirst({
    where: {
      id,
      status: TutorialStatus.PUBLISHED,
      currentRevisionId: { not: null },
    },
    select: {
      id: true,
      authorUserId: true,
      likeCount: true,
      commentCount: true,
      publishedAt: true,
      author: { select: { name: true } },
      currentRevision: true,
    },
  });

  if (!tutorial?.currentRevision) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (viewerId != null) {
    const blocked = await prisma.userBlock.findFirst({
      where: { blockerUserId: viewerId, blockedUserId: tutorial.authorUserId },
      select: { id: true },
    });
    if (blocked) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.json({ tutorial: toPublicTutorialDetail(tutorial) });
}
