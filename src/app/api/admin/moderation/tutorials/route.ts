import { NextResponse } from "next/server";

import { TutorialStatus } from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const pendingSelect = {
  id: true,
  status: true,
  submittedAt: true,
  authorUserId: true,
  currentRevisionId: true,
  author: { select: { id: true, name: true } },
  currentRevision: {
    select: {
      id: true,
      revisionNumber: true,
      titleBn: true,
      summaryBn: true,
      videoUrl: true,
      posterImageUrl: true,
      updatedAt: true,
    },
  },
} as const;

export async function GET(request: Request) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status")?.trim();
  const status =
    statusParam &&
    (Object.values(TutorialStatus) as string[]).includes(statusParam)
      ? (statusParam as TutorialStatus)
      : TutorialStatus.PENDING_APPROVAL;

  const rows = await prisma.tutorial.findMany({
    where: { status },
    orderBy: { submittedAt: "desc" },
    take: 100,
    select: pendingSelect,
  });

  return NextResponse.json({ tutorials: rows, status });
}
