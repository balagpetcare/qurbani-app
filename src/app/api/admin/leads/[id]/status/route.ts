import { NextResponse } from "next/server";

import type { LeadStatus as LeadStatusType } from "@/generated/prisma/enums";
import { LeadStatus } from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { appendLeadStatusHistory } from "@/lib/lead-workflow";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUSES = new Set<string>(Object.values(LeadStatus));

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await context.params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("status" in body)) {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const statusRaw = (body as { status?: unknown }).status;
  if (typeof statusRaw !== "string" || !ALLOWED_STATUSES.has(statusRaw)) {
    return NextResponse.json(
      { error: "Invalid status value" },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (existing.status === statusRaw) {
      return NextResponse.json({
        success: true,
        id: existing.id,
        status: existing.status,
        updatedAt: existing.updatedAt.toISOString(),
        statusChanged: false,
      });
    }

    const lead = await prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data: { status: statusRaw as LeadStatusType },
        select: { id: true, status: true, updatedAt: true },
      });

      await appendLeadStatusHistory(tx, {
        leadId: id,
        fromStatus: existing.status,
        toStatus: statusRaw as LeadStatusType,
        actorKind: "ADMIN",
        actorUserId: auth.userId,
      });

      await tx.leadNote.create({
        data: {
          leadId: id,
          note: `Status changed from ${existing.status} to ${statusRaw} (admin)`,
          createdBy: `admin:${auth.userId}`,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      id: lead.id,
      status: lead.status,
      updatedAt: lead.updatedAt.toISOString(),
      statusChanged: true,
    });
  } catch (err) {
    console.error("PATCH /api/admin/leads/[id]/status", err);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 },
    );
  }
}
