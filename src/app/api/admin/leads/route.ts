import { NextResponse } from "next/server";

import { requireAdminFromRequest } from "@/lib/auth-guards";
import {
  adminLeadsQueryString,
  buildLeadWhere,
  parseAdminLeadsSearchParams,
} from "@/lib/admin-leads-search";
import { buildAdminLeadListRow } from "@/lib/lead-privacy";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const raw: Record<string, string | string[] | undefined> = {};
  for (const [k, v] of url.searchParams.entries()) {
    raw[k] = v;
  }

  const parsed = parseAdminLeadsSearchParams(raw);

  const pageSizeRaw = url.searchParams.get("pageSize");
  let pageSize = 20;
  if (pageSizeRaw) {
    const n = parseInt(pageSizeRaw, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 100) pageSize = n;
  }

  const where = buildLeadWhere(parsed);

  try {
    const [totalCount, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (parsed.page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          customerName: true,
          area: true,
          animalType: true,
          animalKind: true,
          animalCount: true,
          priority: true,
          problemCategory: true,
          problemDetails: true,
          serviceRequirement: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          source: true,
          utmCampaign: true,
          isPossibleDuplicate: true,
          duplicateOfLeadId: true,
          assignedDoctorId: true,
          assignedDoctor: { select: { id: true, name: true } },
          selectedArea: { select: { id: true, name: true, slug: true } },
        },
      }),
    ]);

    const totalPages =
      totalCount === 0 ? 1 : Math.max(1, Math.ceil(totalCount / pageSize));

    return NextResponse.json({
      leads: leads.map((row) => buildAdminLeadListRow(row)),
      pagination: {
        page: parsed.page,
        pageSize,
        totalCount,
        totalPages,
        queryStringForPage: (page: number) =>
          adminLeadsQueryString(parsed, { page }),
      },
    });
  } catch (err) {
    console.error("GET /api/admin/leads", err);
    return NextResponse.json(
      { error: "Failed to load leads" },
      { status: 500 },
    );
  }
}
