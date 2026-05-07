import { NextResponse } from "next/server";

import { PublicCaseHistoryStatus } from "@/generated/prisma/enums";
import { getOptionalDoctorOrCustomerUserId } from "@/lib/mobile-app-user-auth";
import { prisma } from "@/lib/prisma";
import { assertPublicCaseHistoryReadAllowed } from "@/lib/public-rate-limit";
import { toPublicCaseHistoryDetail } from "@/lib/case-history-public-dto";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: RouteCtx) {
  const rl = assertPublicCaseHistoryReadAllowed(request);
  if (rl) return rl;

  const id = Number.parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const viewerId = await getOptionalDoctorOrCustomerUserId(request);

  const row = await prisma.publicCaseHistory.findFirst({
    where: {
      id,
      status: PublicCaseHistoryStatus.PUBLISHED,
      publishedAt: { not: null },
    },
    select: {
      id: true,
      authorDoctorUserId: true,
      titleBn: true,
      summaryBn: true,
      posterImageUrl: true,
      animalKind: true,
      animalTypeLabelBn: true,
      areaBucket: true,
      publishedAt: true,
      likeCount: true,
      commentCount: true,
      problemSummaryBn: true,
      diagnosisSummaryBn: true,
      treatmentSummaryBn: true,
      resultSummaryBn: true,
      bodyBn: true,
      mediaUrls: true,
      authorDoctor: { select: { name: true } },
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (viewerId != null) {
    const blocked = await prisma.userBlock.findFirst({
      where: { blockerUserId: viewerId, blockedUserId: row.authorDoctorUserId },
      select: { id: true },
    });
    if (blocked) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const { authorDoctorUserId: _uid, ...publicRow } = row;
  void _uid;
  return NextResponse.json({ caseHistory: toPublicCaseHistoryDetail(publicRow) });
}
