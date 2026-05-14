import { NextResponse } from "next/server";

import {
  LeadPriority,
  LeadStatus,
  NotificationType,
} from "@/generated/prisma/enums";
import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { doctorCanAccessLead } from "@/lib/doctor-lead-access";
import { appendLeadStatusHistory, isLeadStatusTerminal } from "@/lib/lead-workflow";
import { logOps } from "@/lib/ops-log";
import { prisma } from "@/lib/prisma";
import { queueInAppNotification } from "@/lib/queue-in-app-notification";
import { notifyCustomerDoctorAcceptedSms } from "@/lib/sms-lead-notifications";

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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const cur = await tx.lead.findUnique({
        where: { id },
        select: {
          status: true,
          assignedDoctorId: true,
          acceptedAt: true,
        },
      });
      if (!cur) return { kind: "not_found" as const };
      if (isLeadStatusTerminal(cur.status)) {
        return { kind: "bad_state" as const };
      }

      if (cur.assignedDoctorId === auth.user.id) {
        if (cur.status === LeadStatus.ASSIGNED) {
          await tx.lead.update({
            where: { id },
            data: {
              status: LeadStatus.ACCEPTED,
              acceptedAt: cur.acceptedAt ?? new Date(),
            },
          });
          await appendLeadStatusHistory(tx, {
            leadId: id,
            fromStatus: cur.status,
            toStatus: LeadStatus.ACCEPTED,
            actorKind: "DOCTOR",
            actorUserId: auth.user.id,
          });
          return { kind: "ok" as const };
        }
        if (cur.status === LeadStatus.ACCEPTED) {
          return { kind: "noop" as const };
        }
        return { kind: "bad_state" as const };
      }

      if (cur.assignedDoctorId != null && cur.assignedDoctorId !== auth.user.id) {
        return { kind: "taken" as const };
      }

      if (cur.assignedDoctorId === null && cur.status === LeadStatus.NEW) {
        const upd = await tx.lead.updateMany({
          where: {
            id,
            assignedDoctorId: null,
            status: LeadStatus.NEW,
          },
          data: {
            assignedDoctorId: auth.user.id,
            status: LeadStatus.ACCEPTED,
            acceptedAt: new Date(),
          },
        });
        if (upd.count === 0) {
          return { kind: "conflict" as const };
        }
        await tx.leadAssignment.create({
          data: { leadId: id, doctorId: auth.user.id },
        });
        await appendLeadStatusHistory(tx, {
          leadId: id,
          fromStatus: LeadStatus.NEW,
          toStatus: LeadStatus.ACCEPTED,
          actorKind: "DOCTOR",
          actorUserId: auth.user.id,
          note: "Self-assigned from pool",
        });
        await tx.leadNote.create({
          data: {
            leadId: id,
            note: `ডাঃ ${auth.user.name} পুল থেকে কেস গ্রহণ করেছেন`,
            createdBy: `doctor:${auth.user.id}`,
          },
        });
        return { kind: "ok" as const };
      }

      return { kind: "bad_state" as const };
    });

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (result.kind === "conflict" || result.kind === "taken") {
      return NextResponse.json(
        { error: "কেসটি ইতিমধ্যে অন্য ডাক্তার নিয়েছেন" },
        { status: 409 },
      );
    }
    if (result.kind === "bad_state") {
      return NextResponse.json(
        { error: "এই অবস্থায় কেস গ্রহণ করা যাচ্ছে না" },
        { status: 400 },
      );
    }

    if (result.kind === "ok") {
      const snap = await prisma.lead.findUnique({
        where: { id },
        select: { customerName: true, priority: true },
      });
      if (snap) {
        logOps("doctor_lead_accepted", {
          leadId: id,
          doctorUserId: auth.user.id,
          priority: snap.priority,
          emergency: snap.priority === LeadPriority.EMERGENCY,
        });
        const em =
          snap.priority === LeadPriority.EMERGENCY
            ? "[জরুরি / EMERGENCY] "
            : "";
        await queueInAppNotification({
          type: NotificationType.CASE_ACCEPTED_BY_DOCTOR,
          message: `${em}ডাঃ ${auth.user.name} কেস গ্রহণ করেছেন — লিড #${id} (${snap.customerName})`,
          leadId: id,
        });
      }
      void notifyCustomerDoctorAcceptedSms(id).catch((e) =>
        console.error("[sms] doctor accept notify customer", e),
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/doctor/leads/[id]/accept", err);
    return NextResponse.json(
      { error: "Failed to accept case" },
      { status: 500 },
    );
  }
}
