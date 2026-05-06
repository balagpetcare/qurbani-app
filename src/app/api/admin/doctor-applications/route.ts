import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma/client";
import { DoctorApplicationStatus } from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const statusRaw = url.searchParams.get("status");
  const status =
    statusRaw &&
    Object.values(DoctorApplicationStatus).includes(
      statusRaw as DoctorApplicationStatus,
    )
      ? (statusRaw as DoctorApplicationStatus)
      : undefined;

  const areaIdRaw = url.searchParams.get("areaId");
  let areaFilter: number | undefined;
  if (areaIdRaw) {
    const n = parseInt(areaIdRaw, 10);
    if (!Number.isNaN(n) && n > 0) areaFilter = n;
  }

  try {
    const where: Prisma.DoctorApplicationWhereInput = {};
    if (status) where.status = status;
    if (areaFilter !== undefined) {
      where.areas = { some: { areaId: areaFilter } };
    }

    const applications = await prisma.doctorApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        areas: {
          include: {
            area: { select: { id: true, slug: true, name: true, nameBn: true } },
          },
        },
        reviewedBy: { select: { id: true, name: true } },
        convertedUser: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ applications });
  } catch (err) {
    console.error("GET /api/admin/doctor-applications", err);
    return NextResponse.json(
      { error: "Failed to load applications" },
      { status: 500 },
    );
  }
}
