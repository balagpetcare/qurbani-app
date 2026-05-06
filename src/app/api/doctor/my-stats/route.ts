import { NextResponse } from "next/server";

import { LeadStatus } from "@/generated/prisma/enums";
import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { buildDoctorActionableLeadWhere } from "@/lib/doctor-lead-access";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const where = await buildDoctorActionableLeadWhere(auth.user.id);

    const [
      leadCount,
      completedCount,
      cancelledCount,
      pendingCount,
      observationCount,
    ] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({
        where: { ...where, status: LeadStatus.COMPLETED },
      }),
      prisma.lead.count({
        where: { ...where, status: LeadStatus.CANCELLED },
      }),
      prisma.lead.count({
        where: {
          ...where,
          status: {
            in: [
              LeadStatus.NEW,
              LeadStatus.ASSIGNED,
              LeadStatus.ACCEPTED,
              LeadStatus.IN_PROGRESS,
              LeadStatus.OBSERVED,
            ],
          },
        },
      }),
      prisma.leadObservation.count({
        where: { doctorId: auth.user.id },
      }),
    ]);

    return NextResponse.json({
      doctorId: auth.user.id,
      leadCount,
      completedCount,
      cancelledCount,
      pendingCount,
      observationCount,
    });
  } catch (err) {
    console.error("GET /api/doctor/my-stats", err);
    return NextResponse.json(
      { error: "Failed to load stats" },
      { status: 500 },
    );
  }
}
