import { NextResponse } from "next/server";

import { LeadStatus } from "@/generated/prisma/enums";
import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { doctorCanAccessLead } from "@/lib/doctor-lead-access";
import { isLeadStatusTerminal } from "@/lib/lead-workflow";
import { prisma } from "@/lib/prisma";
import { asTrimmedString } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

const EDITABLE: LeadStatus[] = [
  LeadStatus.ACCEPTED,
  LeadStatus.IN_PROGRESS,
  LeadStatus.OBSERVED,
];

function bodyHas(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { caseReport: true },
    });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (lead.assignedDoctorId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isLeadStatusTerminal(lead.status) || !EDITABLE.includes(lead.status)) {
      return NextResponse.json(
        { error: "Report cannot be edited in this state" },
        { status: 400 },
      );
    }
    if (lead.caseReport?.completedAt) {
      return NextResponse.json(
        { error: "Completed report is locked" },
        { status: 400 },
      );
    }

    const data: Record<string, unknown> = {};

    if (bodyHas(body, "observation")) {
      data.observation = asTrimmedString(body.observation) ?? null;
    }
    if (bodyHas(body, "doctorAdvice")) {
      data.doctorAdvice = asTrimmedString(body.doctorAdvice) ?? null;
    }
    if (bodyHas(body, "diagnosis")) {
      data.diagnosis = asTrimmedString(body.diagnosis) ?? null;
    }
    if (bodyHas(body, "treatmentGiven")) {
      data.treatmentGiven = asTrimmedString(body.treatmentGiven) ?? null;
    }
    if (bodyHas(body, "medicineAdvice")) {
      data.medicineAdvice = asTrimmedString(body.medicineAdvice) ?? null;
    }
    if (bodyHas(body, "followUpNeeded")) {
      if (typeof body.followUpNeeded !== "boolean") {
        return NextResponse.json(
          { error: "followUpNeeded must be boolean" },
          { status: 400 },
        );
      }
      data.followUpNeeded = body.followUpNeeded;
    }
    if (bodyHas(body, "nextFollowUpAt")) {
      if (body.nextFollowUpAt === null) {
        data.nextFollowUpAt = null;
      } else if (typeof body.nextFollowUpAt === "string") {
        const d = new Date(body.nextFollowUpAt);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "Invalid nextFollowUpAt" },
            { status: 400 },
          );
        }
        data.nextFollowUpAt = d;
      } else {
        return NextResponse.json(
          { error: "nextFollowUpAt must be string or null" },
          { status: 400 },
        );
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const report = await prisma.leadCaseReport.upsert({
      where: { leadId: id },
      create: {
        leadId: id,
        ...data,
      },
      update: data,
    });

    return NextResponse.json({ success: true, report });
  } catch (err) {
    console.error("PATCH /api/doctor/leads/[id]/case-report", err);
    return NextResponse.json(
      { error: "Failed to save report" },
      { status: 500 },
    );
  }
}
