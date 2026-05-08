import { NextResponse } from "next/server";

import {
  LeadPriority,
  LeadStatus,
  NotificationChannel,
  NotificationType,
  UserRole,
} from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { appendLeadStatusHistory } from "@/lib/lead-workflow";
import { logOps } from "@/lib/ops-log";
import { prisma } from "@/lib/prisma";
import { queueInAppNotification } from "@/lib/queue-in-app-notification";
import { notifyCustomerLeadStatusSms } from "@/lib/sms-lead-notifications";
import { formatLeadAnimalDisplay } from "@/lib/lead-display";
import { phoneToWhatsAppNumber } from "@/lib/phone";
import { getDoctorInAppNotificationsEnabled } from "@/lib/site-settings";

type RouteContext = { params: Promise<{ id: string }> };

function buildDoctorAssignedWhatsAppMessage(
  lead: {
    id: number;
    customerName: string;
    phone: string;
    area: string | null;
    selectedArea?: { name: string } | null;
    animalType: string | null;
    animalKind: import("@/generated/prisma/enums").AnimalKind | null;
    animalCount: number | null;
    priority: import("@/generated/prisma/enums").LeadPriority;
    message: string | null;
    serviceRequirement: string;
  },
  doctorName: string,
): string {
  const areaLabel = lead.selectedArea?.name ?? lead.area ?? "—";
  const animal = formatLeadAnimalDisplay(lead.animalKind, lead.animalType);
  const em =
    lead.priority === LeadPriority.EMERGENCY ? "[জরুরি / EMERGENCY] " : "";
  return [
    `${em}You have been assigned Qurbani lead #${lead.id}.`,
    `Priority: ${lead.priority}`,
    `Customer: ${lead.customerName}`,
    `Phone: ${lead.phone}`,
    `Area: ${areaLabel}`,
    `Animal: ${animal} (count: ${lead.animalCount ?? "—"})`,
    `Service / requirement: ${lead.serviceRequirement}`,
    `Extra message: ${lead.message ?? "—"}`,
    `— Assigned to Dr. ${doctorName}`,
  ].join("\n");
}

function parseDoctorId(raw: unknown): number | null | undefined {
  if (raw === null) return null;
  if (raw === undefined) return undefined;
  if (typeof raw === "number" && Number.isInteger(raw)) return raw;
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t === "") return null;
    const n = parseInt(t, 10);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await context.params;
  const leadId = parseInt(idParam, 10);
  if (Number.isNaN(leadId)) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("doctorId" in body)) {
    return NextResponse.json({ error: "doctorId is required" }, { status: 400 });
  }

  const doctorId = parseDoctorId((body as { doctorId?: unknown }).doctorId);
  if (doctorId === undefined) {
    return NextResponse.json(
      { error: "doctorId must be a number or null" },
      { status: 400 },
    );
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedDoctor: { select: { id: true, name: true } },
        selectedArea: { select: { name: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (doctorId !== null && lead.assignedDoctorId === doctorId) {
      const unchanged = await prisma.lead.findUnique({
        where: { id: leadId },
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
        },
      });
      return NextResponse.json({ success: true, lead: unchanged, changed: false });
    }

    if (doctorId === null && lead.assignedDoctorId === null) {
      const unchanged = await prisma.lead.findUnique({
        where: { id: leadId },
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
        },
      });
      return NextResponse.json({ success: true, lead: unchanged, changed: false });
    }

    if (doctorId === null) {
      const prevName = lead.assignedDoctor?.name;
      const prevStatus = lead.status;
      const nextStatus =
        prevStatus === LeadStatus.ASSIGNED || prevStatus === LeadStatus.ACCEPTED
          ? LeadStatus.NEW
          : prevStatus;
      await prisma.$transaction(async (tx) => {
        await tx.lead.update({
          where: { id: leadId },
          data: {
            assignedDoctorId: null,
            ...(nextStatus !== prevStatus ? { status: nextStatus } : {}),
          },
        });
        if (nextStatus !== prevStatus) {
          await appendLeadStatusHistory(tx, {
            leadId,
            fromStatus: prevStatus,
            toStatus: nextStatus,
            actorKind: "ADMIN",
            note: "Unassigned",
          });
        }
        await tx.leadNote.create({
          data: {
            leadId,
            note: prevName
              ? `Lead unassigned (was Dr. ${prevName})`
              : "Lead unassigned",
            createdBy: null,
          },
        });
      });

      const updated = await prisma.lead.findUnique({
        where: { id: leadId },
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
        },
      });

      return NextResponse.json({ success: true, lead: updated, changed: true });
    }

    const doctor = await prisma.user.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    if (doctor.role !== UserRole.DOCTOR) {
      return NextResponse.json(
        { error: "User is not a doctor" },
        { status: 400 },
      );
    }

    if (!doctor.isActive) {
      return NextResponse.json(
        { error: "Doctor is not active" },
        { status: 400 },
      );
    }

    const shouldSetAssigned =
      lead.status !== LeadStatus.COMPLETED &&
      lead.status !== LeadStatus.FOLLOW_UP_NEEDED &&
      lead.status !== LeadStatus.CANCELLED &&
      lead.status !== LeadStatus.REFERRED;

    const prevStatus = lead.status;
    const nextStatus = shouldSetAssigned ? LeadStatus.ASSIGNED : prevStatus;

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: {
          assignedDoctorId: doctorId,
          ...(nextStatus !== prevStatus ? { status: nextStatus } : {}),
        },
      });
      if (nextStatus !== prevStatus) {
        await appendLeadStatusHistory(tx, {
          leadId,
          fromStatus: prevStatus,
          toStatus: nextStatus,
          actorKind: "ADMIN",
          note: `Assigned to Dr. ${doctor.name}`,
        });
      }
      await tx.leadAssignment.create({
        data: {
          leadId,
          doctorId,
        },
      });
      await tx.leadNote.create({
        data: {
          leadId,
          note: `Lead assigned to Dr. ${doctor.name}`,
          createdBy: null,
        },
      });
    });

    try {
      const doctorNotifOn = await getDoctorInAppNotificationsEnabled();
      if (doctorNotifOn) {
        const contactRaw =
          doctor.whatsapp?.trim() || doctor.phone?.trim() || null;
        const recipientPhone = contactRaw
          ? phoneToWhatsAppNumber(contactRaw) ??
            contactRaw.replace(/\D/g, "")
          : null;
        await prisma.notification.create({
          data: {
            type: NotificationType.DOCTOR_ASSIGNED,
            channel: NotificationChannel.WHATSAPP,
            leadId,
            recipientName: doctor.name,
            recipientPhone,
            message: buildDoctorAssignedWhatsAppMessage(lead, doctor.name),
          },
        });
        const emInApp =
          lead.priority === LeadPriority.EMERGENCY ? "[জরুরি / EMERGENCY] " : "";
        await queueInAppNotification({
          type: NotificationType.DOCTOR_ASSIGNED,
          leadId,
          message: `${emInApp}লিড #${leadId} ডাঃ ${doctor.name}-এ অ্যাসাইন — ${lead.customerName} (${lead.phone})`,
        });
      }
    } catch (notifyErr) {
      console.error(
        "PATCH /api/admin/leads/[id]/assign-doctor: notification queue",
        notifyErr,
      );
    }

    if (nextStatus !== prevStatus) {
      void notifyCustomerLeadStatusSms({
        leadId,
        fromStatus: prevStatus,
        toStatus: nextStatus,
      }).catch((e) =>
        console.error("[sms] admin assign customer status", e),
      );
    }

    const updated = await prisma.lead.findUnique({
      where: { id: leadId },
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
        selectedArea: { select: { id: true, name: true, slug: true } },
      },
    });

    logOps("admin_lead_assigned", {
      leadId,
      doctorId,
      adminUserId: auth.userId,
      priority: lead.priority,
      emergency: lead.priority === LeadPriority.EMERGENCY,
    });

    return NextResponse.json({ success: true, lead: updated, changed: true });
  } catch (err) {
    console.error("PATCH /api/admin/leads/[id]/assign-doctor", err);
    return NextResponse.json(
      { error: "Failed to assign doctor" },
      { status: 500 },
    );
  }
}
