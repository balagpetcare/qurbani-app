import { NextResponse } from "next/server";

import { DoctorAreaPreferenceStatus, UserRole } from "@/generated/prisma/enums";
import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  bangladeshPhoneDatabaseVariants,
  BD_PHONE_INVALID_MSG_BN,
  BD_WHATSAPP_INVALID_MSG_BN,
  normalizeBangladeshPhone,
} from "@/lib/phone";
import { asTrimmedString } from "@/lib/validators";

const AVAILABILITY = new Set(["AVAILABLE", "LIMITED", "OFF", ""]);

const doctorSelfSelect = {
  id: true,
  name: true,
  phone: true,
  whatsapp: true,
  email: true,
  emergencyAvailable: true,
  qualification: true,
  experienceSummary: true,
  shortBio: true,
  availableTimeText: true,
  availabilityStatus: true,
  profilePhotoUrl: true,
  notifyEmail: true,
  notifySms: true,
  notifyWhatsApp: true,
  doctorAreas: {
    select: {
      area: { select: { id: true, name: true, nameBn: true, slug: true } },
    },
  },
  doctorAreaPreferenceRequests: {
    where: { status: DoctorAreaPreferenceStatus.PENDING },
    orderBy: { createdAt: "desc" },
    take: 1,
    select: { id: true, requestedAreaIds: true, createdAt: true },
  },
} as const;

export async function GET(request: Request) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const doctor = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: doctorSelfSelect,
    });
    if (!doctor) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ doctor });
  } catch (err) {
    console.error("GET /api/doctor/me", err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { id: auth.user.id, role: UserRole.DOCTOR },
  });
  if (!existing) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  const name = asTrimmedString(body.name);
  if (name !== undefined) {
    if (!name) {
      return NextResponse.json({ error: "নাম খালি রাখা যাবে না।" }, { status: 400 });
    }
    data.name = name;
  }

  const phoneRaw = asTrimmedString(body.phone);
  if (phoneRaw !== undefined) {
    const n = normalizeBangladeshPhone(phoneRaw);
    if (!n) {
      return NextResponse.json({ error: BD_PHONE_INVALID_MSG_BN }, { status: 400 });
    }
    const dup = await prisma.user.findFirst({
      where: {
        NOT: { id: auth.user.id },
        phone: { in: bangladeshPhoneDatabaseVariants(n) },
      },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json(
        { error: "এই ফোন নম্বর অন্য অ্যাকাউন্টে ব্যবহৃত হয়েছে।" },
        { status: 400 },
      );
    }
    data.phone = n;
  }

  if ("whatsapp" in body) {
    const w = asTrimmedString(body.whatsapp);
    if (!w) data.whatsapp = null;
    else {
      const n = normalizeBangladeshPhone(w);
      if (!n) {
        return NextResponse.json({ error: BD_WHATSAPP_INVALID_MSG_BN }, { status: 400 });
      }
      data.whatsapp = n;
    }
  }

  if ("email" in body) {
    const em = asTrimmedString(body.email);
    if (em) {
      const dup = await prisma.user.findFirst({
        where: {
          email: em.toLowerCase(),
          NOT: { id: auth.user.id },
        },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json(
          { error: "এই ইমেইল অন্য অ্যাকাউন্টে ব্যবহৃত হয়েছে।" },
          { status: 400 },
        );
      }
      data.email = em.toLowerCase();
    } else {
      data.email = null;
    }
  }

  if ("qualification" in body) {
    data.qualification = asTrimmedString(body.qualification) ?? null;
  }
  if ("experienceSummary" in body) {
    data.experienceSummary = asTrimmedString(body.experienceSummary) ?? null;
  }
  if ("shortBio" in body) {
    data.shortBio = asTrimmedString(body.shortBio) ?? null;
  }
  if ("availableTimeText" in body) {
    data.availableTimeText = asTrimmedString(body.availableTimeText) ?? null;
  }
  if ("notes" in body) {
    data.notes = asTrimmedString(body.notes) ?? null;
  }

  if ("availabilityStatus" in body) {
    if (body.availabilityStatus === null) {
      data.availabilityStatus = null;
    } else {
      const s = asTrimmedString(body.availabilityStatus) ?? "";
      const up = s.toUpperCase();
      if (!AVAILABILITY.has(up)) {
        return NextResponse.json({ error: "অবস্থার মান অবৈধ।" }, { status: 400 });
      }
      data.availabilityStatus = up === "" ? null : up;
    }
  }

  if ("profilePhotoUrl" in body) {
    const u = asTrimmedString(body.profilePhotoUrl);
    if (!u) data.profilePhotoUrl = null;
    else if (!/^https:\/\//i.test(u)) {
      return NextResponse.json(
        { error: "ছবির লিংক অবশ্যই HTTPS হতে হবে।" },
        { status: 400 },
      );
    } else {
      data.profilePhotoUrl = u.slice(0, 2000);
    }
  }

  if (typeof body.emergencyAvailable === "boolean") {
    data.emergencyAvailable = body.emergencyAvailable;
  }
  if (typeof body.notifyEmail === "boolean") data.notifyEmail = body.notifyEmail;
  if (typeof body.notifySms === "boolean") data.notifySms = body.notifySms;
  if (typeof body.notifyWhatsApp === "boolean") {
    data.notifyWhatsApp = body.notifyWhatsApp;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "কোনো পরিবর্তন নেই।" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: auth.user.id },
      data,
    });
    const doctor = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: doctorSelfSelect,
    });
    return NextResponse.json({ success: true, doctor });
  } catch (err) {
    console.error("PATCH /api/doctor/me", err);
    return NextResponse.json({ error: "আপডেট ব্যর্থ।" }, { status: 500 });
  }
}
