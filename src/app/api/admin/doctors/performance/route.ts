import { NextResponse } from "next/server";

import { LeadStatus, UserRole } from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { doctorLeadVisibilityWhereFromAreaIds } from "@/lib/doctor-lead-access";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const doctors = await prisma.user.findMany({
      where: { role: UserRole.DOCTOR },
      select: { id: true, name: true, isActive: true, email: true, phone: true },
      orderBy: { name: "asc" },
    });

    const stats = await Promise.all(
      doctors.map(async (d) => {
        const areas = await prisma.doctorArea.findMany({
          where: { userId: d.id },
          select: { areaId: true },
        });
        const areaIds = areas.map((a) => a.areaId);
        const visibilityWhere = doctorLeadVisibilityWhereFromAreaIds(
          d.id,
          areaIds,
        );

        const [
          leadCount,
          completedCount,
          cancelledCount,
          pendingCount,
          observationCount,
        ] = await Promise.all([
          prisma.lead.count({ where: visibilityWhere }),
          prisma.lead.count({
            where: {
              ...visibilityWhere,
              status: LeadStatus.COMPLETED,
            },
          }),
          prisma.lead.count({
            where: {
              ...visibilityWhere,
              status: LeadStatus.CANCELLED,
            },
          }),
          prisma.lead.count({
            where: {
              ...visibilityWhere,
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
          prisma.leadObservation.count({ where: { doctorId: d.id } }),
        ]);

        return {
          doctor: d,
          leadCount,
          completedCount,
          cancelledCount,
          pendingCount,
          observationCount,
        };
      }),
    );

    return NextResponse.json({ stats });
  } catch (err) {
    console.error("GET /api/admin/doctors/performance", err);
    return NextResponse.json(
      { error: "Failed to load performance stats" },
      { status: 500 },
    );
  }
}
