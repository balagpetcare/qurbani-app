import { NextResponse } from "next/server";

import { TutorialStatus } from "@/generated/prisma/enums";
import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { assertDoctorTutorialWriteAllowed } from "@/lib/public-rate-limit";
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

export async function GET(request: Request) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  const list = await prisma.tutorial.findMany({
    where: { authorUserId: auth.user.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
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

  return NextResponse.json({ tutorials: list });
}

export async function POST(request: Request) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  const rl = assertDoctorTutorialWriteAllowed(request, auth.user.id);
  if (rl) return rl;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = validateTutorialContent(body as Record<string, unknown>, {
    requireTitleVideo: true,
  });
  if (!parsed.ok) {
    return NextResponse.json({ error: "Validation failed", details: parsed.errors }, { status: 400 });
  }
  const v = parsed.value;

  const created = await prisma.$transaction(async (tx) => {
    const tutorial = await tx.tutorial.create({
      data: {
        authorUserId: auth.user.id,
        status: TutorialStatus.DRAFT,
      },
    });
    const revision = await tx.tutorialRevision.create({
      data: {
        tutorialId: tutorial.id,
        revisionNumber: 1,
        titleBn: v.titleBn,
        summaryBn: v.summaryBn,
        bodyBn: v.bodyBn,
        videoUrl: v.videoUrl,
        posterImageUrl: v.posterImageUrl,
        durationSec: v.durationSec,
        mimeType: v.mimeType,
        byteSize: v.byteSize,
        createdByUserId: auth.user.id,
      },
    });
    await tx.tutorial.update({
      where: { id: tutorial.id },
      data: { currentRevisionId: revision.id },
    });
    return tx.tutorial.findUniqueOrThrow({
      where: { id: tutorial.id },
      select: {
        id: true,
        status: true,
        currentRevision: { select: revisionSelect },
      },
    });
  });

  return NextResponse.json({ tutorial: created }, { status: 201 });
}
