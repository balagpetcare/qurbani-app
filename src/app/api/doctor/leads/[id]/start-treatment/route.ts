import { NextResponse } from "next/server";

import { LeadStatus } from "@/generated/prisma/enums";
import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { doctorCanAccessLead } from "@/lib/doctor-lead-access";
import { doctorCanMutateLeadCase } from "@/lib/lead-privacy";
import { appendLeadStatusHistory, isLeadStatusTerminal } from "@/lib/lead-workflow";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
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

  try {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (
      !doctorCanMutateLeadCase(auth.user.id, {
        assignedDoctorId: lead.assignedDoctorId,
      })
    ) {
      return NextResponse.json(
        { error: "শুধু অ্যাসাইন ডাক্তার চিকিৎসা শুরু করতে পারেন" },
        { status: 403 },
      );
    }
    if (isLeadStatusTerminal(lead.status)) {
      return NextResponse.json({ error: "Terminal state" }, { status: 400 });
    }

    if (
      lead.status !== LeadStatus.ACCEPTED &&
      lead.status !== LeadStatus.ASSIGNED
    ) {
      return NextResponse.json(
        { error: "আগে কেস গ্রহণ করুন, অথবা ইতিমধ্যে চলমান" },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id },
        data: { status: LeadStatus.IN_PROGRESS },
      });
      await appendLeadStatusHistory(tx, {
        leadId: id,
        fromStatus: lead.status,
        toStatus: LeadStatus.IN_PROGRESS,
        actorKind: "DOCTOR",
        actorUserId: auth.user.id,
      });
      await tx.leadCaseReport.upsert({
        where: { leadId: id },
        create: { leadId: id },
        update: {},
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/doctor/leads/[id]/start-treatment", err);
    return NextResponse.json(
      { error: "Failed to start treatment" },
      { status: 500 },
    );
  }
}
