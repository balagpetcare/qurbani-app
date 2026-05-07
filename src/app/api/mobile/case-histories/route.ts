import { NextResponse } from "next/server";

import { PublicCaseHistoryStatus } from "@/generated/prisma/enums";
import { getOptionalDoctorOrCustomerUserId } from "@/lib/mobile-app-user-auth";
import { prisma } from "@/lib/prisma";
import { assertPublicCaseHistoryReadAllowed } from "@/lib/public-rate-limit";
import { toPublicCaseHistoryCard } from "@/lib/case-history-public-dto";

export async function GET(request: Request) {
  const rl = assertPublicCaseHistoryReadAllowed(request);
  if (rl) return rl;

  const viewerId = await getOptionalDoctorOrCustomerUserId(request);

  const blockedIds =
    viewerId != null
      ? (
          await prisma.userBlock.findMany({
            where: { blockerUserId: viewerId },
            select: { blockedUserId: true },
          })
        ).map((b) => b.blockedUserId)
      : [];

  const url = new URL(request.url);
  const take = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get("take") ?? "20", 10) || 20));
  const skip = Math.min(500, Math.max(0, Number.parseInt(url.searchParams.get("skip") ?? "0", 10) || 0));

  const rows = await prisma.publicCaseHistory.findMany({
    where: {
      status: PublicCaseHistoryStatus.PUBLISHED,
      publishedAt: { not: null },
      ...(blockedIds.length ? { authorDoctorUserId: { notIn: blockedIds } } : {}),
    },
    orderBy: { publishedAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      titleBn: true,
      summaryBn: true,
      posterImageUrl: true,
      animalKind: true,
      animalTypeLabelBn: true,
      areaBucket: true,
      publishedAt: true,
      likeCount: true,
      commentCount: true,
      authorDoctor: { select: { name: true } },
    },
  });

  const caseHistories = rows.map(toPublicCaseHistoryCard);
  return NextResponse.json({ caseHistories, skip, take });
}
