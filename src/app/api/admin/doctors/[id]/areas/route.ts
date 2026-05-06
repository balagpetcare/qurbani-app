import { NextResponse } from "next/server";

import { UserRole } from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { parsePositiveIntIds } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await context.params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid doctor id" }, { status: 400 });
  }

  let body: { areaIds?: unknown };
  try {
    body = (await request.json()) as { areaIds?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const areaIds = parsePositiveIntIds(body.areaIds);
  const uniqueAreaIds = [...new Set(areaIds)];
  if (uniqueAreaIds.length === 0) {
    return NextResponse.json(
      { error: "areaIds must include at least one area" },
      { status: 400 },
    );
  }

  const doctor = await prisma.user.findFirst({
    where: { id, role: UserRole.DOCTOR },
    select: { id: true },
  });
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const areasOk = await prisma.area.count({
    where: { id: { in: uniqueAreaIds }, isActive: true },
  });
  if (areasOk !== uniqueAreaIds.length) {
    return NextResponse.json(
      { error: "One or more areaIds are invalid or inactive" },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction([
      prisma.doctorArea.deleteMany({ where: { userId: id } }),
      prisma.doctorArea.createMany({
        data: uniqueAreaIds.map((areaId) => ({ userId: id, areaId })),
      }),
    ]);

    const updated = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        doctorAreas: {
          select: {
            area: { select: { id: true, slug: true, name: true, nameBn: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, doctor: updated });
  } catch (err) {
    console.error("PUT /api/admin/doctors/[id]/areas", err);
    return NextResponse.json(
      { error: "Failed to update doctor areas" },
      { status: 500 },
    );
  }
}
