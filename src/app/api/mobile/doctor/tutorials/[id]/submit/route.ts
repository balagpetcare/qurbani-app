import { NextResponse } from "next/server";

import { TutorialStatus } from "@/generated/prisma/enums";
import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { assertDoctorTutorialWriteAllowed } from "@/lib/public-rate-limit";
import { tutorialRevisionToInput } from "@/lib/tutorial-revision-input";
import { validateTutorialContent } from "@/lib/tutorial-validation";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  const rl = assertDoctorTutorialWriteAllowed(request, auth.user.id);
  if (rl) return rl;

  const id = Number.parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
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
      { error: "Only draft or rejected tutorials can be submitted." },
      { status: 409 },
    );
  }

  const merged = tutorialRevisionToInput(tutorial.currentRevision);
  const parsed = validateTutorialContent(merged, { requireTitleVideo: true });
  if (!parsed.ok) {
    return NextResponse.json({ error: "Validation failed", details: parsed.errors }, { status: 400 });
  }

  const updated = await prisma.tutorial.update({
    where: { id: tutorial.id },
    data: {
      status: TutorialStatus.PENDING_APPROVAL,
      submittedAt: new Date(),
      rejectionReason: null,
      rejectedAt: null,
    },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      currentRevision: {
        select: {
          id: true,
          titleBn: true,
          videoUrl: true,
        },
      },
    },
  });

  return NextResponse.json({ tutorial: updated });
}
