import { NextResponse } from "next/server";

import type { LeadStatus as LeadStatusType } from "@/generated/prisma/enums";
import { LeadStatus } from "@/generated/prisma/enums";
import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { doctorCanAccessLead } from "@/lib/doctor-lead-access";
import {
  appendLeadStatusHistory,
  doctorQuickStatusTargets,
  isLeadStatusTerminal,
} from "@/lib/lead-workflow";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED_STATUSES = new Set<string>(Object.values(LeadStatus));

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await context.params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }

  const can = await doctorCanAccessLead(auth.user.id, id);
  if (!can) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const nextStatus = statusRaw as LeadStatusType;

  if (nextStatus === LeadStatus.COMPLETED || nextStatus === LeadStatus.FOLLOW_UP_NEEDED) {
    return NextResponse.json(
      {
        error:
          "সম্পন্ন বা ফলোআপসহ সমাপ্তি নিচের চিকিৎসা ও বিলিং ফর্ম ব্যবহার করুন",
      },
      { status: 400 },
    );
  }

  try {
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (existing.assignedDoctorId !== auth.user.id) {
      return NextResponse.json(
        { error: "শুধু অ্যাসাইন ডাক্তার স্ট্যাটাস বদলাতে পারেন" },
        { status: 403 },
      );
    }

    if (isLeadStatusTerminal(existing.status)) {
      return NextResponse.json(
        { error: "Terminal state cannot change" },
        { status: 400 },
      );
    }

    const allowed = doctorQuickStatusTargets(existing.status);
    if (!allowed.includes(nextStatus)) {
      return NextResponse.json(
        { error: "This status change is not allowed from the current step" },
        { status: 400 },
      );
    }

    if (existing.status === nextStatus) {
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
        data: { status: nextStatus },
        select: { id: true, status: true, updatedAt: true },
      });

      await appendLeadStatusHistory(tx, {
        leadId: id,
        fromStatus: existing.status,
        toStatus: nextStatus,
        actorKind: "DOCTOR",
        actorUserId: auth.user.id,
      });

      await tx.leadNote.create({
        data: {
          leadId: id,
          note: `Status ${existing.status} → ${nextStatus} (doctor ${auth.user.name})`,
          createdBy: `doctor:${auth.user.id}`,
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
    console.error("PATCH /api/doctor/leads/[id]/status", err);
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 },
    );
  }
}
