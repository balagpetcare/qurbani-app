import { NextResponse } from "next/server";

import { PublicCaseHistoryStatus } from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const pendingSelect = {
  id: true,
  status: true,
  submittedAt: true,
  authorDoctorUserId: true,
  sourceLeadId: true,
  titleBn: true,
  summaryBn: true,
  problemSummaryBn: true,
  diagnosisSummaryBn: true,
  treatmentSummaryBn: true,
  resultSummaryBn: true,
  areaBucket: true,
  animalKind: true,
  animalTypeLabelBn: true,
  mediaUrls: true,
  posterImageUrl: true,
  authorDoctor: { select: { id: true, name: true } },
} as const;

export async function GET(request: Request) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status")?.trim();
  const status =
    statusParam &&
    (Object.values(PublicCaseHistoryStatus) as string[]).includes(statusParam)
      ? (statusParam as PublicCaseHistoryStatus)
      : PublicCaseHistoryStatus.PENDING_APPROVAL;

  const rows = await prisma.publicCaseHistory.findMany({
    where: { status },
    orderBy: { submittedAt: "desc" },
    take: 100,
    select: pendingSelect,
  });

  return NextResponse.json({ caseHistories: rows, status });
}
