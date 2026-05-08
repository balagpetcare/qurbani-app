import { randomBytes } from "crypto";

import { LeadStatus, UserRole } from "@/generated/prisma/enums";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildCustomerLeadAcceptedSms,
  buildDoctorNewLeadSms,
  buildLeadTrackingSms,
  customerStatusSmsBody,
} from "@/lib/server/sms/sms.templates";
import { getPublicAppUrl } from "@/lib/server/sms/sms-env";
import { sendSms } from "@/lib/server/sms/sms.service";
import { SMS_PURPOSE } from "@/lib/server/sms/sms.types";
import { normalizeBdPhone } from "@/lib/server/sms/bulksmsbd";

export function randomLeadTrackingCode(): string {
  return randomBytes(12)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 14);
}

export async function ensureLeadTrackingCode(
  db: Pick<PrismaClient, "lead">,
  leadId: number,
): Promise<string> {
  const row = await db.lead.findUnique({
    where: { id: leadId },
    select: { publicTrackingCode: true },
  });
  if (row?.publicTrackingCode) return row.publicTrackingCode;

  for (let i = 0; i < 12; i++) {
    const code = randomLeadTrackingCode();
    try {
      await db.lead.update({
        where: { id: leadId },
        data: { publicTrackingCode: code },
      });
      return code;
    } catch {
      /* unique collision */
    }
  }
  throw new Error("tracking_code_generation_failed");
}

function leadPublicUrl(trackingCode: string): string {
  const base = getPublicAppUrl();
  const path = `/track/${trackingCode}`;
  return base ? `${base}${path}` : path;
}

function doctorLeadUrl(leadId: number): string {
  const base = getPublicAppUrl();
  const path = `/doctor/leads/${leadId}`;
  return base ? `${base}${path}` : path;
}

/** Customer SMS after intake + doctor/admin alerts. Failures are logged only. */
export async function notifyLeadCreatedSms(leadId: number): Promise<{
  customer: "sent" | "failed" | "skipped";
}> {
  let customerStatus: "sent" | "failed" | "skipped" = "skipped";

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        selectedArea: { select: { nameBn: true, name: true } },
      },
    });
    if (!lead) return { customer: "skipped" };

    const code = await ensureLeadTrackingCode(prisma, lead.id);
    const trackingUrl = leadPublicUrl(code);
    const msg = buildLeadTrackingSms(trackingUrl);

    const r = await sendSms({
      to: lead.phone,
      message: msg,
      purpose: SMS_PURPOSE.LEAD_TRACKING,
      leadId: lead.id,
    });

    if (r.ok && r.status === "sent") customerStatus = "sent";
    else if (!r.ok && r.status === "failed") customerStatus = "failed";
    else customerStatus = "skipped";

    const areaLabel =
      lead.selectedArea?.nameBn?.trim() ||
      lead.selectedArea?.name?.trim() ||
      lead.area?.trim() ||
      "—";

    if (lead.areaId !== null) {
      const doctors = await prisma.user.findMany({
        where: {
          role: UserRole.DOCTOR,
          isActive: true,
          notifySms: true,
          phone: { not: null },
          doctorAreas: { some: { areaId: lead.areaId } },
        },
        select: { id: true, phone: true },
      });

      const doctorUrl = doctorLeadUrl(lead.id);
      const dMsg = buildDoctorNewLeadSms(areaLabel, doctorUrl);

      for (const d of doctors) {
        if (!d.phone) continue;
        void sendSms({
          to: d.phone,
          message: dMsg,
          purpose: SMS_PURPOSE.DOCTOR_NEW_LEAD,
          leadId: lead.id,
          userId: d.id,
        }).catch((e) => console.error("[sms] doctor new lead", e));
      }
    }

    const adminDigits = process.env.ADMIN_SMS_ALERT_PHONE?.trim();
    if (adminDigits) {
      const norm = normalizeBdPhone(adminDigits);
      if (norm.ok) {
        const adminMsg = buildDoctorNewLeadSms(areaLabel, doctorLeadUrl(lead.id));
        void sendSms({
          to: norm.international880,
          message: adminMsg,
          purpose: SMS_PURPOSE.ADMIN_NEW_LEAD,
          leadId: lead.id,
        }).catch((e) => console.error("[sms] admin new lead", e));
      }
    }
  } catch (e) {
    console.error("[sms] notifyLeadCreatedSms", e);
  }

  return { customer: customerStatus };
}

export async function notifyCustomerDoctorAcceptedSms(
  leadId: number,
): Promise<void> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, phone: true },
    });
    if (!lead) return;

    const code = await ensureLeadTrackingCode(prisma, lead.id);
    const url = leadPublicUrl(code);
    const msg = buildCustomerLeadAcceptedSms(url);

    await sendSms({
      to: lead.phone,
      message: msg,
      purpose: SMS_PURPOSE.CUSTOMER_ACCEPTED,
      leadId: lead.id,
    });
  } catch (e) {
    console.error("[sms] notifyCustomerDoctorAcceptedSms", e);
  }
}

const NOTIFY_CUSTOMER_STATUSES = new Set<LeadStatus>([
  LeadStatus.ASSIGNED,
  LeadStatus.ACCEPTED,
  LeadStatus.IN_PROGRESS,
  LeadStatus.COMPLETED,
  LeadStatus.FOLLOW_UP_NEEDED,
  LeadStatus.CANCELLED,
]);

export async function notifyCustomerLeadStatusSms(input: {
  leadId: number;
  fromStatus: LeadStatus;
  toStatus: LeadStatus;
}): Promise<void> {
  if (input.fromStatus === input.toStatus) return;
  if (!NOTIFY_CUSTOMER_STATUSES.has(input.toStatus)) return;

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: input.leadId },
      select: { id: true, phone: true },
    });
    if (!lead) return;

    const code = await ensureLeadTrackingCode(prisma, lead.id);
    const url = leadPublicUrl(code);

    let body: string | null = null;
    if (input.toStatus === LeadStatus.ACCEPTED) {
      body = buildCustomerLeadAcceptedSms(url);
    } else {
      const key =
        input.toStatus === LeadStatus.ASSIGNED
          ? "ASSIGNED"
          : input.toStatus === LeadStatus.IN_PROGRESS
            ? "IN_PROGRESS"
            : input.toStatus === LeadStatus.COMPLETED
              ? "COMPLETED"
              : input.toStatus === LeadStatus.FOLLOW_UP_NEEDED
                ? "FOLLOW_UP_NEEDED"
                : input.toStatus === LeadStatus.CANCELLED
                  ? "CANCELLED"
                  : null;
      if (!key) return;
      body = customerStatusSmsBody(key, url);
    }

    if (!body) return;

    await sendSms({
      to: lead.phone,
      message: body,
      purpose: SMS_PURPOSE.CUSTOMER_STATUS,
      leadId: lead.id,
    });
  } catch (e) {
    console.error("[sms] notifyCustomerLeadStatusSms", e);
  }
}
