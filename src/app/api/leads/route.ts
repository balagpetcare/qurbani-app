import { NextResponse } from "next/server";

import {
  AnimalKind,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  LeadPriority,
} from "@/generated/prisma/enums";
import {
  bangladeshPhoneDatabaseVariants,
  BD_PHONE_INVALID_MSG_BN,
  BD_WHATSAPP_INVALID_MSG_BN,
  normalizeBangladeshPhone,
} from "@/lib/phone";
import { maskPhoneForLog, logOps } from "@/lib/ops-log";
import { parsePublicLeadIntake } from "@/lib/public-lead-intake";
import { prisma } from "@/lib/prisma";
import { assertLeadSubmissionAllowed } from "@/lib/public-rate-limit";
import {
  getAdminInAppNotificationsEnabled,
  getEmergencyLeadEnabled,
  getLeadFormEnabled,
} from "@/lib/site-settings";
import { asTrimmedString } from "@/lib/validators";

type LeadBody = {
  customerName?: unknown;
  phone?: unknown;
  whatsapp?: unknown;
  areaId?: unknown;
  address?: unknown;
  animalType?: unknown;
  animalTypeOther?: unknown;
  animalKind?: unknown;
  animalCount?: unknown;
  approxAgeText?: unknown;
  approxWeightKg?: unknown;
  problemCategory?: unknown;
  problemDuration?: unknown;
  eatingStatus?: unknown;
  feverSuspected?: unknown;
  bellyBloated?: unknown;
  canWalk?: unknown;
  problemDetails?: unknown;
  priority?: unknown;
  preferredContact?: unknown;
  googleMapUrl?: unknown;
  mediaUrls?: unknown;
  preferredDate?: unknown;
  preferredTime?: unknown;
  serviceRequirement?: unknown;
  message?: unknown;
  source?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  utmContent?: unknown;
  utmTerm?: unknown;
  utmArea?: unknown;
  landingPath?: unknown;
};

const SVC_MAX = 8000;
const MSG_MAX = 8000;
const ADDR_MAX = 4000;

function clamp(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

export async function POST(request: Request) {
  if (!(await getLeadFormEnabled())) {
    return NextResponse.json(
      {
        error: "LEAD_FORM_DISABLED",
        messageBn:
          "এই মুহূর্তে অনলাইন ফর্ম বন্ধ আছে। দয়া করে কল বা WhatsApp করে যোগাযোগ করুন।",
      },
      { status: 403 },
    );
  }

  let body: LeadBody;
  try {
    body = (await request.json()) as LeadBody;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body",
        messageBn:
          "তথ্য পাঠাতে সমস্যা হয়েছে। পেজ রিফ্রেশ করে আবার চেষ্টা করুন।",
      },
      { status: 400 },
    );
  }

  const customerName = asTrimmedString(body.customerName);
  const phoneRaw = asTrimmedString(body.phone);
  const serviceRequirementRaw = asTrimmedString(body.serviceRequirement);
  const serviceRequirement = serviceRequirementRaw
    ? clamp(serviceRequirementRaw, SVC_MAX)
    : "";

  let areaId: number | undefined;
  if (typeof body.areaId === "number" && Number.isInteger(body.areaId)) {
    areaId = body.areaId;
  } else if (typeof body.areaId === "string") {
    const n = parseInt(body.areaId.trim(), 10);
    if (!Number.isNaN(n) && n > 0) areaId = n;
  }

  if (!customerName || !phoneRaw) {
    return NextResponse.json(
      {
        error: "customerName and phone are required",
        messageBn: "আপনার নাম ও মোবাইল নম্বর দিন।",
      },
      { status: 400 },
    );
  }

  if (areaId === undefined) {
    return NextResponse.json(
      {
        error: "areaId is required",
        messageBn: "সেবার এলাকা বেছে নিন।",
      },
      { status: 400 },
    );
  }

  if (!serviceRequirement) {
    return NextResponse.json(
      {
        error: "serviceRequirement is required",
        messageBn: "সমস্যাটা সংক্ষেপে লিখুন।",
      },
      { status: 400 },
    );
  }

  const intake = parsePublicLeadIntake(body as Record<string, unknown>);
  if ("error" in intake) {
    const errText = intake.error;
    return NextResponse.json(
      {
        error: errText,
        messageBn: errText,
      },
      { status: 400 },
    );
  }
  const extra = intake.ok;

  if (!extra.animalKind) {
    return NextResponse.json(
      {
        error: "animalKind is required",
        messageBn: "পশুর ধরন বেছে নিন।",
      },
      { status: 400 },
    );
  }

  if (!(await getEmergencyLeadEnabled())) {
    if (
      extra.priority === LeadPriority.URGENT ||
      extra.priority === LeadPriority.EMERGENCY
    ) {
      return NextResponse.json(
        {
          error: "EMERGENCY_LEADS_DISABLED",
          messageBn:
            "জরুরি/ইমার্জেন্সি অনলাইন রিকোয়েস্ট এখন বন্ধ। সাধারণ অগ্রাধিকারে জমা দিন অথবা কল/WhatsApp করুন।",
        },
        { status: 403 },
      );
    }
  }

  const phone = normalizeBangladeshPhone(phoneRaw);
  if (!phone) {
    return NextResponse.json(
      { error: BD_PHONE_INVALID_MSG_BN, messageBn: BD_PHONE_INVALID_MSG_BN },
      { status: 400 },
    );
  }

  const areaExists = await prisma.area.findFirst({
    where: { id: areaId, isActive: true },
    select: { id: true },
  });
  if (!areaExists) {
    return NextResponse.json(
      {
        error: "Invalid or inactive areaId",
        messageBn:
          "এই এলাকাটি এখন নির্বাচন করা যাচ্ছে না। অন্য এলাকা বেছে নিন।",
      },
      { status: 400 },
    );
  }

  const whatsappRaw = asTrimmedString(body.whatsapp);
  const whatsappNormalized = whatsappRaw
    ? normalizeBangladeshPhone(whatsappRaw)
    : undefined;
  if (whatsappRaw && !whatsappNormalized) {
    return NextResponse.json(
      {
        error: BD_WHATSAPP_INVALID_MSG_BN,
        messageBn: BD_WHATSAPP_INVALID_MSG_BN,
      },
      { status: 400 },
    );
  }

  const rateLimited = assertLeadSubmissionAllowed(request, phone);
  if (rateLimited) return rateLimited;

  let animalCount: number | undefined;
  if (body.animalCount !== undefined && body.animalCount !== null) {
    if (typeof body.animalCount === "number" && Number.isFinite(body.animalCount)) {
      animalCount = Math.floor(body.animalCount);
    } else if (typeof body.animalCount === "string") {
      const n = parseInt(body.animalCount.trim(), 10);
      if (!Number.isNaN(n) && n >= 0) animalCount = n;
    }
  }

  let preferredDate: Date | undefined;
  const pd = asTrimmedString(body.preferredDate);
  if (pd) {
    const d = new Date(pd);
    if (!Number.isNaN(d.getTime())) preferredDate = d;
  }

  const animalKind = extra.animalKind;
  const animalTypeForDb =
    animalKind === AnimalKind.OTHER
      ? clamp(asTrimmedString(body.animalTypeOther) ?? "", 200)
      : asTrimmedString(body.animalType) ?? undefined;

  const messageRaw = asTrimmedString(body.message);
  const message = messageRaw ? clamp(messageRaw, MSG_MAX) : undefined;

  const addressRaw = asTrimmedString(body.address);
  const address = addressRaw ? clamp(addressRaw, ADDR_MAX) : undefined;

  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const priorDuplicate = await prisma.lead.findFirst({
      where: {
        phone: { in: bangladeshPhoneDatabaseVariants(phone) },
        createdAt: { gte: since24h },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    const selectedArea = await prisma.area.findUnique({
      where: { id: areaId },
      select: { name: true },
    });

    const lead = await prisma.lead.create({
      data: {
        customerName,
        phone,
        whatsapp: whatsappNormalized,
        isPossibleDuplicate: !!priorDuplicate,
        duplicateOfLeadId: priorDuplicate?.id,
        areaId,
        area: selectedArea?.name ?? undefined,
        address,
        animalKind,
        animalType: animalTypeForDb,
        animalCount,
        approxAgeText: extra.approxAgeText,
        approxWeightKg: extra.approxWeightKg,
        problemCategory: extra.problemCategory,
        problemDuration: extra.problemDuration,
        eatingStatus: extra.eatingStatus,
        feverSuspected: extra.feverSuspected,
        bellyBloated: extra.bellyBloated,
        canWalk: extra.canWalk,
        problemDetails: extra.problemDetails,
        priority: extra.priority,
        preferredContact: extra.preferredContact,
        googleMapUrl: extra.googleMapUrl,
        mediaUrls: extra.mediaUrlsJson,
        preferredDate,
        preferredTime: asTrimmedString(body.preferredTime),
        serviceRequirement,
        message,
        source: asTrimmedString(body.source),
        utmSource: asTrimmedString(body.utmSource),
        utmMedium: asTrimmedString(body.utmMedium),
        utmCampaign: asTrimmedString(body.utmCampaign),
        utmContent: asTrimmedString(body.utmContent),
        utmTerm: asTrimmedString(body.utmTerm),
        utmArea: asTrimmedString(body.utmArea),
        landingPath: asTrimmedString(body.landingPath),
      },
    });

    try {
      const emergency = lead.priority === LeadPriority.EMERGENCY;
      const urgent = lead.priority === LeadPriority.URGENT;
      const prefix = emergency
        ? "[জরুরি / EMERGENCY] "
        : urgent
          ? "[URGENT] "
          : "";
      const notifType = emergency
        ? NotificationType.EMERGENCY_LEAD
        : NotificationType.NEW_LEAD;
      if (await getAdminInAppNotificationsEnabled()) {
        await prisma.notification.create({
          data: {
            type: notifType,
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.PENDING,
            leadId: lead.id,
            message: `${prefix}নতুন কুরবানি লিড — ${lead.customerName} — ${lead.phone}`,
          },
        });
      }
    } catch (notifyErr) {
      console.error("POST /api/leads: notification queue", notifyErr);
    }

    logOps("lead_submitted", {
      leadId: lead.id,
      priority: lead.priority,
      areaId,
      possibleDuplicate: priorDuplicate ? true : false,
      phoneMasked: maskPhoneForLog(phone),
      emergency: lead.priority === LeadPriority.EMERGENCY,
    });

    return NextResponse.json(
      { success: true, id: lead.id },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/leads", err);
    return NextResponse.json(
      {
        error: "Failed to save lead",
        messageBn: "সার্ভারে জমা হয়নি। একটু পরে আবার চেষ্টা করুন।",
      },
      { status: 500 },
    );
  }
}
