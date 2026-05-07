import { NextResponse } from "next/server";

import { TutorialStatus } from "@/generated/prisma/enums";
import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { assertDoctorTutorialWriteAllowed } from "@/lib/public-rate-limit";
import { tutorialRevisionToInput } from "@/lib/tutorial-revision-input";
import { validateTutorialContent } from "@/lib/tutorial-validation";

const revisionSelect = {
  id: true,
  titleBn: true,
  summaryBn: true,
  bodyBn: true,
  videoUrl: true,
  posterImageUrl: true,
  durationSec: true,
  mimeType: true,
  byteSize: true,
  revisionNumber: true,
  updatedAt: true,
} as const;

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: RouteCtx) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  const id = Number.parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const tutorial = await prisma.tutorial.findFirst({
    where: { id, authorUserId: auth.user.id },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      publishedAt: true,
      rejectedAt: true,
      rejectionReason: true,
      createdAt: true,
      updatedAt: true,
      currentRevision: { select: revisionSelect },
    },
  });
  if (!tutorial) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ tutorial });
}

export async function PATCH(request: Request, ctx: RouteCtx) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  const rl = assertDoctorTutorialWriteAllowed(request, auth.user.id);
  if (rl) return rl;

  const id = Number.parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const tutorial = await prisma.tutorial.findFirst({
    where: { id, authorUserId: auth.user.id },
    include: { currentRevision: true },
  });
  if (!tutorial?.currentRevision) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    tutorial.status !== TutorialStatus.DRAFT &&
    tutorial.status !== TutorialStatus.REJECTED
  ) {
    return NextResponse.json(
      { error: "Only draft or rejected tutorials can be edited." },
      { status: 409 },
    );
  }

  const existing = tutorialRevisionToInput(tutorial.currentRevision);
  const partial = body as Record<string, unknown>;
  const merged: Record<string, unknown> = {
    titleBn: partial.titleBn !== undefined ? partial.titleBn : existing.titleBn,
    summaryBn: partial.summaryBn !== undefined ? partial.summaryBn : existing.summaryBn,
    bodyBn: partial.bodyBn !== undefined ? partial.bodyBn : existing.bodyBn,
    videoUrl: partial.videoUrl !== undefined ? partial.videoUrl : existing.videoUrl,
    posterImageUrl:
      partial.posterImageUrl !== undefined ? partial.posterImageUrl : existing.posterImageUrl,
    durationSec: partial.durationSec !== undefined ? partial.durationSec : existing.durationSec,
    mimeType: partial.mimeType !== undefined ? partial.mimeType : existing.mimeType,
    byteSize: partial.byteSize !== undefined ? partial.byteSize : existing.byteSize,
  };

  const parsed = validateTutorialContent(merged, { requireTitleVideo: true });
  if (!parsed.ok) {
    return NextResponse.json({ error: "Validation failed", details: parsed.errors }, { status: 400 });
  }
  const v = parsed.value;

  await prisma.tutorialRevision.update({
    where: { id: tutorial.currentRevision.id },
    data: {
      titleBn: v.titleBn,
      summaryBn: v.summaryBn,
      bodyBn: v.bodyBn,
      videoUrl: v.videoUrl,
      posterImageUrl: v.posterImageUrl,
      durationSec: v.durationSec,
      mimeType: v.mimeType,
      byteSize: v.byteSize,
    },
  });

  const next = await prisma.tutorial.findUniqueOrThrow({
    where: { id: tutorial.id },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      publishedAt: true,
      rejectedAt: true,
      rejectionReason: true,
      currentRevision: { select: revisionSelect },
    },
  });

  return NextResponse.json({ tutorial: next });
}
