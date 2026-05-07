import { NextResponse } from "next/server";

import { TutorialStatus } from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const id = Number.parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { revisionId?: unknown } = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object") body = raw as { revisionId?: unknown };
  } catch {
    // empty body OK
  }

  const tutorial = await prisma.tutorial.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      currentRevisionId: true,
    },
  });
  if (!tutorial || tutorial.status !== TutorialStatus.PENDING_APPROVAL) {
    return NextResponse.json(
      { error: "Tutorial not pending approval." },
      { status: 409 },
    );
  }

  let revisionId = tutorial.currentRevisionId;
  if (body.revisionId != null) {
    const rid = Number.parseInt(String(body.revisionId), 10);
    if (!Number.isFinite(rid)) {
      return NextResponse.json({ error: "Invalid revisionId" }, { status: 400 });
    }
    const rev = await prisma.tutorialRevision.findFirst({
      where: { id: rid, tutorialId: tutorial.id },
      select: { id: true },
    });
    if (!rev) {
      return NextResponse.json({ error: "Revision not found for tutorial." }, { status: 400 });
    }
    revisionId = rid;
  }

  if (revisionId == null) {
    return NextResponse.json(
      { error: "Tutorial has no revision to approve." },
      { status: 409 },
    );
  }

  const updated = await prisma.tutorial.update({
    where: { id: tutorial.id },
    data: {
      status: TutorialStatus.PUBLISHED,
      publishedAt: new Date(),
      reviewedByUserId: auth.userId,
      currentRevisionId: revisionId,
      rejectionReason: null,
      rejectedAt: null,
    },
    select: {
      id: true,
      status: true,
      publishedAt: true,
      currentRevisionId: true,
    },
  });

  return NextResponse.json({ tutorial: updated });
}
