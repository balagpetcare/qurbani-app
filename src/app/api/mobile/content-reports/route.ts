import { NextResponse } from "next/server";

import {
  ContentReportReason,
  ContentReportStatus,
  ModerationTargetType,
  PublicCaseHistoryStatus,
  TutorialStatus,
} from "@/generated/prisma/enums";
import { requireDoctorOrCustomerFromRequest } from "@/lib/mobile-app-user-auth";
import { prisma } from "@/lib/prisma";
import { assertContentReportAllowed } from "@/lib/public-rate-limit";
import { validateReportDetails } from "@/lib/tutorial-validation";

export async function POST(request: Request) {
  const auth = await requireDoctorOrCustomerFromRequest(request);
  if (!auth.ok) return auth.response;

  const rl = assertContentReportAllowed(request, auth.userId);
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
  const b = body as Record<string, unknown>;
  const targetType = b.targetType;
  const targetId = b.targetId;
  const reason = b.reason;
  const detailsRaw = b.details;

  const isTutorial =
    targetType === ModerationTargetType.TUTORIAL || targetType === "TUTORIAL";
  const isCaseHistory =
    targetType === ModerationTargetType.PUBLIC_CASE_HISTORY ||
    targetType === "PUBLIC_CASE_HISTORY";

  if (!isTutorial && !isCaseHistory) {
    return NextResponse.json(
      { error: "Unsupported targetType for mobile report." },
      { status: 400 },
    );
  }

  const tid = typeof targetId === "number" ? targetId : Number.parseInt(String(targetId), 10);
  if (!Number.isFinite(tid)) {
    return NextResponse.json({ error: "Invalid targetId" }, { status: 400 });
  }

  if (
    typeof reason !== "string" ||
    !(Object.values(ContentReportReason) as string[]).includes(reason)
  ) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  const detailsParsed = validateReportDetails(detailsRaw);
  if (!detailsParsed.ok) {
    return NextResponse.json({ error: detailsParsed.message }, { status: 400 });
  }

  let resolvedTargetType: ModerationTargetType;
  if (isTutorial) {
    const tutorial = await prisma.tutorial.findUnique({
      where: { id: tid },
      select: { id: true, status: true },
    });
    if (!tutorial) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }
    if (tutorial.status !== TutorialStatus.PUBLISHED) {
      return NextResponse.json(
        { error: "Only published tutorials can be reported." },
        { status: 400 },
      );
    }
    resolvedTargetType = ModerationTargetType.TUTORIAL;
  } else {
    const ch = await prisma.publicCaseHistory.findUnique({
      where: { id: tid },
      select: { id: true, status: true },
    });
    if (!ch) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }
    if (ch.status !== PublicCaseHistoryStatus.PUBLISHED) {
      return NextResponse.json(
        { error: "Only published case histories can be reported." },
        { status: 400 },
      );
    }
    resolvedTargetType = ModerationTargetType.PUBLIC_CASE_HISTORY;
  }

  const row = await prisma.contentReport.create({
    data: {
      reporterUserId: auth.userId,
      targetType: resolvedTargetType,
      targetId: tid,
      reason: reason as ContentReportReason,
      details: detailsParsed.value,
      status: ContentReportStatus.OPEN,
    },
    select: {
      id: true,
      status: true,
      targetType: true,
      targetId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ report: row }, { status: 201 });
}
