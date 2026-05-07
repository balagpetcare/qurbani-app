import { NextResponse } from "next/server";

import { PublicCaseHistoryStatus } from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { validateRejectionReason } from "@/lib/tutorial-validation";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

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
  const reasonRaw =
    typeof body === "object" && body !== null
      ? (body as { reasonBn?: unknown; reason?: unknown }).reasonBn ??
        (body as { reason?: unknown }).reason
      : undefined;

  const reasonParsed = validateRejectionReason(reasonRaw);
  if (!reasonParsed.ok) {
    return NextResponse.json({ error: reasonParsed.message }, { status: 400 });
  }

  const row = await prisma.publicCaseHistory.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!row || row.status !== PublicCaseHistoryStatus.PENDING_APPROVAL) {
    return NextResponse.json(
      { error: "Case history not pending approval." },
      { status: 409 },
    );
  }

  const updated = await prisma.publicCaseHistory.update({
    where: { id: row.id },
    data: {
      status: PublicCaseHistoryStatus.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: reasonParsed.value,
      reviewedByUserId: auth.userId,
      publishedAt: null,
    },
    select: {
      id: true,
      status: true,
      rejectedAt: true,
      rejectionReason: true,
    },
  });

  return NextResponse.json({ caseHistory: updated });
}
