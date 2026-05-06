import { NextResponse } from "next/server";

import { DoctorAreaPreferenceStatus, UserRole } from "@/generated/prisma/enums";
import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { parsePositiveIntIds } from "@/lib/validators";

export async function POST(request: Request) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const areaIds = parsePositiveIntIds(body.areaIds);
  if (areaIds.length === 0) {
    return NextResponse.json(
      { error: "কমপক্ষে একটি এলাকা বেছে নিন।" },
      { status: 400 },
    );
  }

  const doctor = await prisma.user.findFirst({
    where: { id: auth.user.id, role: UserRole.DOCTOR },
    select: { id: true },
  });
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const areas = await prisma.area.findMany({
    where: { id: { in: areaIds }, isActive: true },
    select: { id: true },
  });
  if (areas.length !== areaIds.length) {
    return NextResponse.json(
      { error: "এক বা একাধিক এলাকা অবৈধ বা নিষ্ক্রিয়।" },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction([
      prisma.doctorAreaPreferenceRequest.deleteMany({
        where: {
          userId: doctor.id,
          status: DoctorAreaPreferenceStatus.PENDING,
        },
      }),
      prisma.doctorAreaPreferenceRequest.create({
        data: {
          userId: doctor.id,
          requestedAreaIds: areaIds,
          status: DoctorAreaPreferenceStatus.PENDING,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/doctor/me/area-preference", err);
    return NextResponse.json({ error: "অনুরোধ সংরক্ষণ ব্যর্থ।" }, { status: 500 });
  }
}
