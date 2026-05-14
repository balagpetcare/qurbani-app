import { NextResponse } from "next/server";

import type { LeadStatus as LeadStatusType } from "@/generated/prisma/enums";
import { LeadStatus, UserRole } from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { leadCompletedAtForStatusTransition } from "@/lib/lead/lead-completed-at";
import { prisma } from "@/lib/prisma";
import {
  BD_PHONE_INVALID_MSG_BN,
  BD_WHATSAPP_INVALID_MSG_BN,
  normalizeBangladeshPhone,
} from "@/lib/phone";
import { asTrimmedString } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED_STATUSES = new Set<string>(Object.values(LeadStatus));

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await context.params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignedDoctor: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp: true,
            email: true,
            role: true,
          },
        },
        selectedArea: true,
        notes: { orderBy: { createdAt: "desc" } },
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

    return NextResponse.json({ lead });
  } catch (err) {
    console.error("GET /api/admin/leads/[id]", err);
    return NextResponse.json({ error: "Failed to load lead" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await context.params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const data: {
    customerName?: string;
    phone?: string;
    whatsapp?: string | null;
    areaId?: number;
    area?: string | null;
    address?: string | null;
    animalType?: string | null;
    animalCount?: number | null;
    preferredDate?: Date | null;
    preferredTime?: string | null;
    serviceRequirement?: string;
    message?: string | null;
    status?: LeadStatusType;
    assignedDoctorId?: number | null;
    leadCompletedAt?: Date;
  } = {};

  const name = asTrimmedString(body.customerName);
  if (name !== undefined) data.customerName = name;

  const phoneRaw = asTrimmedString(body.phone);
  if (phoneRaw !== undefined) {
    const n = normalizeBangladeshPhone(phoneRaw);
    if (!n) {
      return NextResponse.json({ error: BD_PHONE_INVALID_MSG_BN }, { status: 400 });
    }
    data.phone = n;
  }

  if ("whatsapp" in body) {
    const w = asTrimmedString(body.whatsapp);
    if (w === undefined && body.whatsapp === "") data.whatsapp = null;
    else if (w) {
      const n = normalizeBangladeshPhone(w);
      if (!n) {
        return NextResponse.json(
          { error: BD_WHATSAPP_INVALID_MSG_BN },
          { status: 400 },
        );
      }
      data.whatsapp = n;
    }
  }

  if (body.areaId !== undefined) {
    const aid =
      typeof body.areaId === "number"
        ? body.areaId
        : typeof body.areaId === "string"
          ? parseInt(String(body.areaId), 10)
          : NaN;
    if (Number.isNaN(aid) || aid < 1) {
      return NextResponse.json({ error: "Invalid areaId" }, { status: 400 });
    }
    const a = await prisma.area.findFirst({
      where: { id: aid, isActive: true },
      select: { id: true, name: true },
    });
    if (!a) {
      return NextResponse.json({ error: "Invalid areaId" }, { status: 400 });
    }
    data.areaId = aid;
    data.area = a.name;
  }

  if ("address" in body) {
    data.address = asTrimmedString(body.address) ?? null;
  }
  if ("animalType" in body) {
    data.animalType = asTrimmedString(body.animalType) ?? null;
  }
  if (body.animalCount !== undefined) {
    if (body.animalCount === null) data.animalCount = null;
    else if (typeof body.animalCount === "number") {
      data.animalCount = Math.floor(body.animalCount);
    }
  }

  if ("preferredDate" in body) {
    const s = asTrimmedString(body.preferredDate);
    if (!s) data.preferredDate = null;
    else {
      const d = new Date(s);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "Invalid preferredDate" },
          { status: 400 },
        );
      }
      data.preferredDate = d;
    }
  }

  if ("preferredTime" in body) {
    data.preferredTime = asTrimmedString(body.preferredTime) ?? null;
  }

  const svc = asTrimmedString(body.serviceRequirement);
  if (svc !== undefined) {
    if (!svc) {
      return NextResponse.json(
        { error: "serviceRequirement cannot be empty" },
        { status: 400 },
      );
    }
    data.serviceRequirement = svc;
  }

  if ("message" in body) {
    data.message = asTrimmedString(body.message) ?? null;
  }

  if (body.status !== undefined) {
    const st = asTrimmedString(body.status);
    if (!st || !ALLOWED_STATUSES.has(st)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = st as LeadStatusType;
  }

  if (body.assignedDoctorId !== undefined) {
    if (body.assignedDoctorId === null) {
      data.assignedDoctorId = null;
    } else {
      const did = Number(body.assignedDoctorId);
      if (!Number.isInteger(did)) {
        return NextResponse.json({ error: "Invalid assignedDoctorId" }, { status: 400 });
      }
      const doc = await prisma.user.findFirst({
        where: { id: did, role: UserRole.DOCTOR, isActive: true },
      });
      if (!doc) {
        return NextResponse.json({ error: "Doctor not found or inactive" }, { status: 400 });
      }
      data.assignedDoctorId = did;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  if (data.status !== undefined) {
    const completedAt = leadCompletedAtForStatusTransition(
      existing.status,
      data.status,
      existing.leadCompletedAt,
    );
    if (completedAt !== undefined) {
      data.leadCompletedAt = completedAt;
    }
  }

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data,
      include: {
        assignedDoctor: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp: true,
            email: true,
          },
        },
        selectedArea: true,
      },
    });

    return NextResponse.json({ success: true, lead });
  } catch (err) {
    console.error("PATCH /api/admin/leads/[id]", err);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await context.params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }

  try {
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ success: true, deletedId: id });
  } catch (err) {
    console.error("DELETE /api/admin/leads/[id]", err);
    return NextResponse.json(
      { error: "Failed to delete lead" },
      { status: 500 },
    );
  }
}
