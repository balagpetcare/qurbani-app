import { NextResponse } from "next/server";

import {
  DoctorApplicationStatus,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from "@/generated/prisma/enums";
import { maskEmailForLog, maskPhoneForLog, logOps } from "@/lib/ops-log";
import { prisma } from "@/lib/prisma";
import {
  bangladeshPhoneDatabaseVariants,
  BD_PHONE_INVALID_MSG_BN,
  BD_WHATSAPP_INVALID_MSG_BN,
  normalizeBangladeshPhone,
} from "@/lib/phone";
import { assertDoctorApplicationAllowed } from "@/lib/public-rate-limit";
import {
  getAdminInAppNotificationsEnabled,
  getDoctorApplicationsEnabled,
} from "@/lib/site-settings";
import { asTrimmedString, parsePositiveIntIds } from "@/lib/validators";

const PIPELINE_STATUSES: DoctorApplicationStatus[] = [
  DoctorApplicationStatus.NEW,
  DoctorApplicationStatus.REVIEWED,
  DoctorApplicationStatus.APPROVED,
];

function asOptionalUrl(value: unknown): string | undefined {
  const s = asTrimmedString(value);
  if (!s) return undefined;
  if (!/^https?:\/\//i.test(s)) return undefined;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return s;
  } catch {
    return undefined;
  }
}

function asOptionalBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  return undefined;
}

function asOptionalPositiveInt(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseInt(value.trim(), 10)
        : NaN;
  if (!Number.isInteger(n) || n < 0 || n > 500_000) return undefined;
  return n;
}

export async function POST(request: Request) {
  if (!(await getDoctorApplicationsEnabled())) {
    return NextResponse.json(
      {
        error: "DOCTOR_APPLICATIONS_DISABLED",
        messageBn:
          "ডাক্তার আবেদন ফর্ম এখন বন্ধ আছে। পরে আবার চেষ্টা করুন অথবা অ্যাডমিনের সাথে যোগাযোগ করুন।",
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

  const name = asTrimmedString(body.name);
  const phoneRaw = asTrimmedString(body.phone);
  const email = asTrimmedString(body.email)?.toLowerCase();
  const areaIds = parsePositiveIntIds(body.areaIds);

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!phoneRaw) {
    return NextResponse.json({ error: "phone is required" }, { status: 400 });
  }
  const phone = normalizeBangladeshPhone(phoneRaw);
  if (!phone) {
    return NextResponse.json({ error: BD_PHONE_INVALID_MSG_BN }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }
  if (areaIds.length === 0) {
    return NextResponse.json(
      { error: "areaIds must include at least one area" },
      { status: 400 },
    );
  }

  const rateLimited = assertDoctorApplicationAllowed(request, phone);
  if (rateLimited) return rateLimited;

  const areas = await prisma.area.findMany({
    where: { id: { in: areaIds }, isActive: true },
    select: { id: true },
  });
  if (areas.length !== areaIds.length) {
    return NextResponse.json(
      { error: "One or more areaIds are invalid or inactive" },
      { status: 400 },
    );
  }

  const whatsappRaw = asTrimmedString(body.whatsapp);
  const whatsappNorm = whatsappRaw
    ? normalizeBangladeshPhone(whatsappRaw)
    : undefined;
  if (whatsappRaw && !whatsappNorm) {
    return NextResponse.json(
      { error: BD_WHATSAPP_INVALID_MSG_BN },
      { status: 400 },
    );
  }

  const certificateUrl = asOptionalUrl(body.certificateUrl);
  if (asTrimmedString(body.certificateUrl) && !certificateUrl) {
    return NextResponse.json(
      { error: "certificateUrl must be a valid http(s) URL" },
      { status: 400 },
    );
  }

  const emergencyAvailable = asOptionalBool(body.emergencyAvailable) ?? false;
  const ownTransport = asOptionalBool(body.ownTransport) ?? false;
  const visitCharge = asOptionalPositiveInt(body.expectedVisitCharge);

  const dupUser = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: { in: bangladeshPhoneDatabaseVariants(phone) } },
        { email: { equals: email, mode: "insensitive" } },
      ],
    },
    select: { id: true, role: true },
  });
  if (dupUser) {
    return NextResponse.json(
      {
        error:
          "এই ফোন বা ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট আছে। লগইন করুন বা অ্যাডমিনের সাথে যোগাযোগ করুন।",
      },
      { status: 409 },
    );
  }

  const dupApp = await prisma.doctorApplication.findFirst({
    where: {
      status: { in: PIPELINE_STATUSES },
      OR: [
        { phone: { in: bangladeshPhoneDatabaseVariants(phone) } },
        { email: { equals: email, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (dupApp) {
    return NextResponse.json(
      {
        error:
          "এই ফোন বা ইমেইলে একটি সক্রিয় আবেদন ইতিমধ্যে আছে। অনুগ্রহ করে অপেক্ষা করুন বা অ্যাডমিনের সাথে যোগাযোগ করুন।",
      },
      { status: 409 },
    );
  }

  try {
    const app = await prisma.doctorApplication.create({
      data: {
        name,
        phone,
        whatsapp: whatsappNorm ?? undefined,
        email,
        address: asTrimmedString(body.address),
        experience: asTrimmedString(body.experience),
        qualification: asTrimmedString(body.qualification),
        note: asTrimmedString(body.note),
        animalExpertise: asTrimmedString(body.animalExpertise),
        availableTimeText: asTrimmedString(body.availableTimeText),
        emergencyAvailable,
        ownTransport,
        expectedVisitCharge: visitCharge,
        shortBio: asTrimmedString(body.shortBio),
        certificateUrl: certificateUrl ?? undefined,
        areas: {
          create: areaIds.map((areaId) => ({ areaId })),
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        name: true,
        phone: true,
      },
    });

    try {
      if (await getAdminInAppNotificationsEnabled()) {
        await prisma.notification.create({
          data: {
            type: NotificationType.DOCTOR_APPLICATION,
            channel: NotificationChannel.IN_APP,
            status: NotificationStatus.PENDING,
            message: `নতুন ডাক্তার আবেদন #${app.id} — ${app.name} (${app.phone}) · রিভিউ: /admin/doctor-applications/${app.id}`,
          },
        });
      }
    } catch (notifyErr) {
      console.error("POST /api/doctor-applications: notification queue", notifyErr);
    }

    logOps("doctor_application_submitted", {
      applicationId: app.id,
      phoneMasked: maskPhoneForLog(phone),
      emailMasked: maskEmailForLog(email),
      areaCount: areaIds.length,
    });

    return NextResponse.json({ success: true, application: app }, { status: 201 });
  } catch (err) {
    console.error("POST /api/doctor-applications", err);
    return NextResponse.json(
      { error: "Failed to submit application" },
      { status: 500 },
    );
  }
}
