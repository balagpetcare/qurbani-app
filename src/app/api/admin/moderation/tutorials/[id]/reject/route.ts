import { NextResponse } from "next/server";

import { TutorialStatus } from "@/generated/prisma/enums";
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

  const tutorial = await prisma.tutorial.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!tutorial || tutorial.status !== TutorialStatus.PENDING_APPROVAL) {
    return NextResponse.json(
      { error: "Tutorial not pending approval." },
      { status: 409 },
    );
  }

  const updated = await prisma.tutorial.update({
    where: { id: tutorial.id },
    data: {
      status: TutorialStatus.REJECTED,
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

  return NextResponse.json({ tutorial: updated });
}
