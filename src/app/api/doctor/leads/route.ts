import { NextResponse } from "next/server";

import { requireDoctorFromRequest } from "@/lib/auth-guards";
import {
  buildDoctorLeadWhere,
  doctorLeadListOrderBy,
  mergeDoctorLeadAreaFilter,
  mergeDoctorLeadListFilters,
  parseDoctorLeadsAreaId,
  parseDoctorLeadsTab,
} from "@/lib/doctor-lead-access";
import { buildDoctorLeadListRow } from "@/lib/lead-privacy";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  let page = 1;
  const p = url.searchParams.get("page");
  if (p) {
    const n = parseInt(p, 10);
    if (!Number.isNaN(n) && n >= 1) page = n;
  }
  let pageSize = 20;
  const ps = url.searchParams.get("pageSize");
  if (ps) {
    const n = parseInt(ps, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 100) pageSize = n;
  }

  const tab = parseDoctorLeadsTab(url.searchParams.get("tab") ?? undefined);
  let areaId = parseDoctorLeadsAreaId(url.searchParams.get("area") ?? undefined);

  try {
    const base = await buildDoctorLeadWhere(auth.user.id);
    const covered = await prisma.doctorArea.findMany({
      where: { userId: auth.user.id },
      select: { areaId: true },
    });
    const coveredIds = new Set(covered.map((c) => c.areaId));
    if (areaId != null && !coveredIds.has(areaId)) {
      areaId = undefined;
    }

    let where = mergeDoctorLeadListFilters(base, tab, auth.user.id);
    where = mergeDoctorLeadAreaFilter(where, areaId);

    const [totalCount, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: doctorLeadListOrderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          customerName: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          area: true,
          animalType: true,
          animalKind: true,
          animalCount: true,
          priority: true,
          problemCategory: true,
          problemDetails: true,
          serviceRequirement: true,
          assignedDoctorId: true,
          selectedArea: { select: { id: true, name: true, slug: true } },
          assignedDoctor: { select: { id: true, name: true } },
        },
      }),
    ]);

    const totalPages =
      totalCount === 0 ? 1 : Math.max(1, Math.ceil(totalCount / pageSize));

    const listRows = leads.map((row) =>
      buildDoctorLeadListRow(row, auth.user.id),
    );

    return NextResponse.json({
      leads: listRows,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    });
  } catch (err) {
    console.error("GET /api/doctor/leads", err);
    return NextResponse.json(
      { error: "Failed to load leads" },
      { status: 500 },
    );
  }
}
