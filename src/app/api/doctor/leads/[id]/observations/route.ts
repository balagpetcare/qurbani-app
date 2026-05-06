import { NextResponse } from "next/server";

import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { doctorCanAccessLead } from "@/lib/doctor-lead-access";
import { doctorCanMutateLeadCase } from "@/lib/lead-privacy";
import { prisma } from "@/lib/prisma";
import { asTrimmedString } from "@/lib/validators";

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

  const leadRow = await prisma.lead.findUnique({
    where: { id },
    select: { assignedDoctorId: true },
  });
  if (
    !leadRow ||
    !doctorCanMutateLeadCase(auth.user.id, {
      assignedDoctorId: leadRow.assignedDoctorId,
    })
  ) {
    return NextResponse.json(
      {
        error:
          "শুধু অ্যাসাইন ডাক্তার পর্যবেক্ষণ যোগ করতে পারেন — আগে কেস গ্রহণ করুন",
      },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const condition = asTrimmedString(body.condition);
  const note = asTrimmedString(body.note);
  if (!condition && !note) {
    return NextResponse.json(
      { error: "Provide condition and/or note" },
      { status: 400 },
    );
  }

  let visitedAt = new Date();
  const vt = asTrimmedString(body.visitedAt);
  if (vt) {
    const d = new Date(vt);
    if (!Number.isNaN(d.getTime())) visitedAt = d;
  }

  try {
    const observation = await prisma.leadObservation.create({
      data: {
        leadId: id,
        doctorId: auth.user.id,
        condition: condition ?? undefined,
        note: note ?? undefined,
        visitedAt,
      },
      include: {
        doctor: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, observation }, { status: 201 });
  } catch (err) {
    console.error("POST /api/doctor/leads/[id]/observations", err);
    return NextResponse.json(
      { error: "Failed to save observation" },
      { status: 500 },
    );
  }
}
