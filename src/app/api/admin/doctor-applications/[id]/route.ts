import { NextResponse } from "next/server";

import type { Prisma } from "@/generated/prisma/client";
import {
  DoctorApplicationStatus,
  NotificationType,
} from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { queueInAppNotification } from "@/lib/queue-in-app-notification";
import { asTrimmedString, parsePositiveIntIds } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

const ALLOWED = new Set<string>(Object.values(DoctorApplicationStatus));

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await context.params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const application = await prisma.doctorApplication.findUnique({
      where: { id },
      include: {
        areas: {
          include: {
            area: { select: { id: true, slug: true, name: true, nameBn: true } },
          },
        },
        reviewedBy: { select: { id: true, name: true, email: true } },
        convertedUser: { select: { id: true, name: true, email: true } },
      },
    });

    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (err) {
    console.error("GET /api/admin/doctor-applications/[id]", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await context.params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.doctorApplication.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.status === DoctorApplicationStatus.CONVERTED_TO_DOCTOR) {
    return NextResponse.json(
      { error: "Application already converted" },
      { status: 400 },
    );
  }

  const statusRaw = asTrimmedString(body.status);
  const hasStatus = Boolean(statusRaw && ALLOWED.has(statusRaw));
  const hasNote = Object.prototype.hasOwnProperty.call(body, "adminReviewNote");
  const hasAreas = Array.isArray(body.areaIds);

  if (!hasStatus && !hasNote && !hasAreas) {
    return NextResponse.json(
      { error: "Provide status and/or adminReviewNote and/or areaIds" },
      { status: 400 },
    );
  }

  let nextStatus: DoctorApplicationStatus | undefined;
  if (hasStatus) {
    nextStatus = statusRaw as DoctorApplicationStatus;
    if (nextStatus === DoctorApplicationStatus.CONVERTED_TO_DOCTOR) {
      return NextResponse.json(
        { error: "Use POST .../convert to convert to doctor user" },
        { status: 400 },
      );
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (hasAreas) {
        const ids = [...new Set(parsePositiveIntIds(body.areaIds))];
        if (ids.length === 0) {
          throw new Error("NO_AREAS");
        }
        const cnt = await tx.area.count({
          where: { id: { in: ids }, isActive: true },
        });
        if (cnt !== ids.length) {
          throw new Error("BAD_AREAS");
        }
        await tx.doctorApplicationArea.deleteMany({
          where: { applicationId: id },
        });
        await tx.doctorApplicationArea.createMany({
          data: ids.map((areaId) => ({ applicationId: id, areaId })),
        });
      }

      const data: Prisma.DoctorApplicationUpdateInput = {};
      if (nextStatus !== undefined) {
        data.status = nextStatus;
        data.reviewedAt = new Date();
        data.reviewedBy = { connect: { id: auth.userId } };
      }
      if (hasNote) {
        data.adminReviewNote = asTrimmedString(body.adminReviewNote) ?? null;
        if (nextStatus === undefined) {
          data.reviewedAt = new Date();
          data.reviewedBy = { connect: { id: auth.userId } };
        }
      }

      if (Object.keys(data).length > 0) {
        await tx.doctorApplication.update({ where: { id }, data });
      }
    });

    if (
      hasStatus &&
      nextStatus !== undefined &&
      existing.status !== nextStatus &&
      (nextStatus === DoctorApplicationStatus.APPROVED ||
        nextStatus === DoctorApplicationStatus.REJECTED ||
        nextStatus === DoctorApplicationStatus.REVIEWED)
    ) {
      const labelBn =
        nextStatus === DoctorApplicationStatus.APPROVED
          ? "অনুমোদিত"
          : nextStatus === DoctorApplicationStatus.REJECTED
            ? "প্রত্যাখ্যাত"
            : "রিভিউ চিহ্নিত";
      await queueInAppNotification({
        type: NotificationType.DOCTOR_APPLICATION_REVIEWED,
        message: `ডাক্তার আবেদন #${id} — ${labelBn} — ${existing.name} (${existing.phone})`,
      });
    }

    const application = await prisma.doctorApplication.findUnique({
      where: { id },
      include: {
        areas: {
          include: {
            area: { select: { id: true, slug: true, name: true, nameBn: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, application });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NO_AREAS") {
        return NextResponse.json(
          { error: "areaIds must include at least one valid id" },
          { status: 400 },
        );
      }
      if (err.message === "BAD_AREAS") {
        return NextResponse.json(
          { error: "One or more areaIds are invalid or inactive" },
          { status: 400 },
        );
      }
    }
    console.error("PATCH /api/admin/doctor-applications/[id]", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
