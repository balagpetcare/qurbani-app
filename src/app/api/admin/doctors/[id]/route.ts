import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { UserRole } from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  bangladeshPhoneDatabaseVariants,
  BD_PHONE_INVALID_MSG_BN,
  BD_WHATSAPP_INVALID_MSG_BN,
  normalizeBangladeshPhone,
} from "@/lib/phone";
import {
  assertHomeVisitFeesConsistent,
  parseDoctorHomeVisitFeesFromBody,
} from "@/lib/doctor-fee-input";
import { asTrimmedString } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await context.params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid doctor id" }, { status: 400 });
  }

  try {
    const doctor = await prisma.user.findFirst({
      where: { id, role: UserRole.DOCTOR },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        whatsapp: true,
        notes: true,
        experienceSummary: true,
        qualification: true,
        shortBio: true,
        availableTimeText: true,
        availabilityStatus: true,
        profilePhotoUrl: true,
        homeVisitFeeMin: true,
        homeVisitFeeMax: true,
        feeNote: true,
        notifyEmail: true,
        notifySms: true,
        notifyWhatsApp: true,
        isActive: true,
        emergencyAvailable: true,
        areaCoverage: true,
        createdAt: true,
        updatedAt: true,
        doctorAreas: {
          select: {
            area: { select: { id: true, slug: true, name: true, nameBn: true } },
          },
        },
      },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json({ doctor });
  } catch (err) {
    console.error("GET /api/admin/doctors/[id]", err);
    return NextResponse.json(
      { error: "Failed to load doctor" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await context.params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid doctor id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { id, role: UserRole.DOCTOR },
  });
  if (!existing) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const data: {
    name?: string;
    phone?: string;
    email?: string | null;
    whatsapp?: string | null;
    notes?: string | null;
    experienceSummary?: string | null;
    qualification?: string | null;
    shortBio?: string | null;
    availableTimeText?: string | null;
    availabilityStatus?: string | null;
    profilePhotoUrl?: string | null;
    notifyEmail?: boolean;
    notifySms?: boolean;
    notifyWhatsApp?: boolean;
    isActive?: boolean;
    emergencyAvailable?: boolean;
    passwordHash?: string;
    homeVisitFeeMin?: number | null;
    homeVisitFeeMax?: number | null;
    feeNote?: string | null;
  } = {};

  const name = asTrimmedString(body.name);
  if (name !== undefined) data.name = name;

  const phoneRaw = asTrimmedString(body.phone);
  if (phoneRaw !== undefined) {
    const n = normalizeBangladeshPhone(phoneRaw);
    if (!n) {
      return NextResponse.json({ error: BD_PHONE_INVALID_MSG_BN }, { status: 400 });
    }
    const dup = await prisma.user.findFirst({
      where: {
        NOT: { id },
        phone: { in: bangladeshPhoneDatabaseVariants(n) },
      },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json(
        { error: "Phone already in use" },
        { status: 400 },
      );
    }
    data.phone = n;
  }

  if ("email" in body) {
    const em = asTrimmedString(body.email);
    if (em) {
      const dup = await prisma.user.findFirst({
        where: {
          email: em.toLowerCase(),
          NOT: { id },
        },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 },
        );
      }
      data.email = em.toLowerCase();
    } else {
      data.email = null;
    }
  }

  if ("whatsapp" in body) {
    const w = asTrimmedString(body.whatsapp);
    if (!w) data.whatsapp = null;
    else {
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

  if ("notes" in body) {
    data.notes = asTrimmedString(body.notes) ?? null;
  }

  const AVAILABILITY = new Set(["AVAILABLE", "LIMITED", "OFF", ""]);

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
  if ("availabilityStatus" in body) {
    if (body.availabilityStatus === null) {
      data.availabilityStatus = null;
    } else {
      const s = asTrimmedString(body.availabilityStatus) ?? "";
      const up = s.toUpperCase();
      if (!AVAILABILITY.has(up)) {
        return NextResponse.json({ error: "Invalid availabilityStatus" }, { status: 400 });
      }
      data.availabilityStatus = up === "" ? null : up;
    }
  }
  if ("profilePhotoUrl" in body) {
    const u = asTrimmedString(body.profilePhotoUrl);
    if (!u) data.profilePhotoUrl = null;
    else if (!/^https:\/\//i.test(u)) {
      return NextResponse.json(
        { error: "profilePhotoUrl must be HTTPS" },
        { status: 400 },
      );
    } else {
      data.profilePhotoUrl = u.slice(0, 2000);
    }
  }
  if (typeof body.notifyEmail === "boolean") data.notifyEmail = body.notifyEmail;
  if (typeof body.notifySms === "boolean") data.notifySms = body.notifySms;
  if (typeof body.notifyWhatsApp === "boolean") {
    data.notifyWhatsApp = body.notifyWhatsApp;
  }

  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.emergencyAvailable === "boolean") {
    data.emergencyAvailable = body.emergencyAvailable;
  }

  const feeParsed = parseDoctorHomeVisitFeesFromBody(body);
  if (!feeParsed.ok) {
    return NextResponse.json({ error: feeParsed.error }, { status: 400 });
  }
  let nextMin = existing.homeVisitFeeMin;
  let nextMax = existing.homeVisitFeeMax;
  if (feeParsed.homeVisitFeeMin !== undefined) {
    nextMin = feeParsed.homeVisitFeeMin;
    data.homeVisitFeeMin = feeParsed.homeVisitFeeMin;
  }
  if (feeParsed.homeVisitFeeMax !== undefined) {
    nextMax = feeParsed.homeVisitFeeMax;
    data.homeVisitFeeMax = feeParsed.homeVisitFeeMax;
  }
  if (feeParsed.feeNote !== undefined) {
    data.feeNote = feeParsed.feeNote;
  }
  const feeErr = assertHomeVisitFeesConsistent(nextMin, nextMax);
  if (feeErr) {
    return NextResponse.json({ error: feeErr }, { status: 400 });
  }

  const newPass =
    typeof body.password === "string" ? body.password : undefined;
  if (newPass !== undefined) {
    if (newPass.length < 8) {
      return NextResponse.json(
        { error: "password must be at least 8 characters" },
        { status: 400 },
      );
    }
    data.passwordHash = await bcrypt.hash(newPass, 12);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const doctor = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        whatsapp: true,
        notes: true,
        experienceSummary: true,
        qualification: true,
        shortBio: true,
        availableTimeText: true,
        availabilityStatus: true,
        profilePhotoUrl: true,
        homeVisitFeeMin: true,
        homeVisitFeeMax: true,
        feeNote: true,
        notifyEmail: true,
        notifySms: true,
        notifyWhatsApp: true,
        isActive: true,
        emergencyAvailable: true,
        updatedAt: true,
        doctorAreas: {
          select: {
            area: { select: { id: true, slug: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, doctor });
  } catch (err) {
    console.error("PATCH /api/admin/doctors/[id]", err);
    return NextResponse.json(
      { error: "Failed to update doctor" },
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
    return NextResponse.json({ error: "Invalid doctor id" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { id, role: UserRole.DOCTOR },
  });
  if (!existing) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true, deactivatedId: id });
  } catch (err) {
    console.error("DELETE /api/admin/doctors/[id]", err);
    return NextResponse.json(
      { error: "Failed to deactivate doctor" },
      { status: 500 },
    );
  }
}
