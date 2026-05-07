import { NextResponse } from "next/server";

import { TutorialStatus } from "@/generated/prisma/enums";
import { getOptionalDoctorOrCustomerUserId } from "@/lib/mobile-app-user-auth";
import { prisma } from "@/lib/prisma";
import { assertPublicTutorialReadAllowed } from "@/lib/public-rate-limit";
import { toPublicTutorialCard } from "@/lib/tutorial-public-dto";

export async function GET(request: Request) {
  const rl = assertPublicTutorialReadAllowed(request);
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

  const rows = await prisma.tutorial.findMany({
    where: {
      status: TutorialStatus.PUBLISHED,
      currentRevisionId: { not: null },
      ...(blockedIds.length ? { authorUserId: { notIn: blockedIds } } : {}),
    },
    orderBy: { publishedAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      likeCount: true,
      commentCount: true,
      publishedAt: true,
      author: { select: { name: true } },
      currentRevision: {
        select: {
          titleBn: true,
          summaryBn: true,
          posterImageUrl: true,
          durationSec: true,
        },
      },
    },
  });

  const tutorials = rows.map(toPublicTutorialCard);
  return NextResponse.json({ tutorials, skip, take });
}
