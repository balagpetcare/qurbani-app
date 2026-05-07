import { NextResponse } from "next/server";

import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { doctorCanAccessLead } from "@/lib/doctor-lead-access";
import {
  canDoctorViewLeadCustomerContact,
  sanitizeDoctorLeadDetailJson,
} from "@/lib/lead-privacy";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
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
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedDoctor: {
          select: {
            id: true,
            name: true,
          },
        },
        selectedArea: true,
        caseReport: {
          select: {
            completedAt: true,
            publicShowcaseEligible: true,
          },
        },
        notes: { orderBy: { createdAt: "desc" }, take: 50 },
        observations: {
          orderBy: { visitedAt: "desc" },
          include: {
            doctor: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const contactVisible = canDoctorViewLeadCustomerContact(
      auth.user.id,
      lead,
    );

    const payload = sanitizeDoctorLeadDetailJson(lead, {
      doctorUserId: auth.user.id,
    });

    const publicCaseHistory = await prisma.publicCaseHistory.findUnique({
      where: { sourceLeadId: id },
      select: { id: true, status: true },
    });

    return NextResponse.json({
      lead: payload,
      contactVisible,
      publicCaseHistory,
    });
  } catch (err) {
    console.error("GET /api/doctor/leads/[id]", err);
    return NextResponse.json({ error: "Failed to load lead" }, { status: 500 });
  }
}
