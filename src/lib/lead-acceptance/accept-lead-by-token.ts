import {
  LeadPriority,
  LeadStatus,
  NotificationType,
} from "@/generated/prisma/enums";
import { appendLeadStatusHistory, isLeadStatusTerminal } from "@/lib/lead-workflow";
import { logOps } from "@/lib/ops-log";
import { prisma } from "@/lib/prisma";
import { queueInAppNotification } from "@/lib/queue-in-app-notification";
import { notifyCustomerDoctorAcceptedSms } from "@/lib/sms-lead-notifications";

import { doctorMatchesLeadServiceArea } from "./area-eligibility";

export type AcceptLeadByTokenResult =
  | { kind: "ok"; leadId: number; fullPhone: string }
  | { kind: "not_found" }
  | { kind: "forbidden_area" }
  | { kind: "bad_state" }
  | { kind: "taken" };

export async function acceptLeadClaimByToken(params: {
  token: string;
  doctorUserId: number;
  doctorName: string;
}): Promise<AcceptLeadByTokenResult> {
  const token = params.token.trim();
  if (!token) return { kind: "not_found" };

  const lead = await prisma.lead.findFirst({
    where: { acceptanceToken: token },
    select: {
      id: true,
      status: true,
      assignedDoctorId: true,
      areaId: true,
      area: true,
      phone: true,
      customerName: true,
      priority: true,
    },
  });

  if (!lead) return { kind: "not_found" };

  if (isLeadStatusTerminal(lead.status)) {
    return { kind: "bad_state" };
  }

  if (lead.assignedDoctorId != null) {
    return { kind: "taken" };
  }

  if (lead.status !== LeadStatus.NEW) {
    return { kind: "bad_state" };
  }

  const areaOk = await doctorMatchesLeadServiceArea(params.doctorUserId, {
    areaId: lead.areaId,
    area: lead.area,
  });
  if (!areaOk) {
    return { kind: "forbidden_area" };
  }

  const result = await prisma.$transaction(async (tx) => {
    const upd = await tx.lead.updateMany({
      where: {
        id: lead.id,
        acceptanceToken: token,
        assignedDoctorId: null,
        status: LeadStatus.NEW,
      },
      data: {
        assignedDoctorId: params.doctorUserId,
        status: LeadStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });
    if (upd.count === 0) {
      return { kind: "taken" as const };
    }

    await tx.leadAssignment.create({
      data: { leadId: lead.id, doctorId: params.doctorUserId },
    });
    await appendLeadStatusHistory(tx, {
      leadId: lead.id,
      fromStatus: LeadStatus.NEW,
      toStatus: LeadStatus.ACCEPTED,
      actorKind: "DOCTOR",
      actorUserId: params.doctorUserId,
      note: "Accepted via secure WhatsApp dispatch link",
    });
    await tx.leadNote.create({
      data: {
        leadId: lead.id,
        note: `ডাঃ ${params.doctorName} WhatsApp লিংক থেকে কেস গ্রহণ করেছেন`,
        createdBy: `doctor:${params.doctorUserId}`,
      },
    });
    return { kind: "ok" as const };
  });

  if (result.kind !== "ok") return result;

  logOps("doctor_lead_accepted_token", {
    leadId: lead.id,
    doctorUserId: params.doctorUserId,
    priority: lead.priority,
    emergency: lead.priority === LeadPriority.EMERGENCY,
  });

  const em =
    lead.priority === LeadPriority.EMERGENCY ? "[জরুরি / EMERGENCY] " : "";
  await queueInAppNotification({
    type: NotificationType.CASE_ACCEPTED_BY_DOCTOR,
    message: `${em}ডাঃ ${params.doctorName} কেস গ্রহণ করেছেন — লিড #${lead.id} (${lead.customerName})`,
    leadId: lead.id,
  });

  void notifyCustomerDoctorAcceptedSms(lead.id).catch((e) =>
    console.error("[sms] doctor accept notify customer (token)", e),
  );

  return { kind: "ok", leadId: lead.id, fullPhone: lead.phone };
}
