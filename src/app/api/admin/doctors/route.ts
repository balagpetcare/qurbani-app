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
import { parsePositiveIntIds } from "@/lib/validators";
import {
  assertHomeVisitFeesConsistent,
  parseDoctorHomeVisitFeesFromBody,
} from "@/lib/doctor-fee-input";

function asTrimmedStringLocal(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length ? t : undefined;
}

export async function GET(request: Request) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const doctors = await prisma.user.findMany({
      where: { role: UserRole.DOCTOR },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        whatsapp: true,
        areaCoverage: true,
        emergencyAvailable: true,
        notes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        doctorAreas: {
          select: {
            area: { select: { id: true, slug: true, name: true, nameBn: true } },
          },
        },
      },
    });

    return NextResponse.json({ doctors });
  } catch (err) {
    console.error("GET /api/admin/doctors", err);
    return NextResponse.json(
      { error: "Failed to load doctors" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const name = asTrimmedStringLocal((body as { name?: unknown }).name);
  const phoneRaw = asTrimmedStringLocal((body as { phone?: unknown }).phone);
  const email = asTrimmedStringLocal((body as { email?: unknown }).email);
  const passwordRaw =
    typeof (body as { password?: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";
  const areaIds = parsePositiveIntIds((body as { areaIds?: unknown }).areaIds);

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
  if (!passwordRaw || passwordRaw.length < 8) {
    return NextResponse.json(
      { error: "password is required (min 8 characters)" },
      { status: 400 },
    );
  }
  if (areaIds.length === 0) {
    return NextResponse.json(
      { error: "areaIds must include at least one area" },
      { status: 400 },
    );
  }

  const whatsappRaw = asTrimmedStringLocal((body as { whatsapp?: unknown }).whatsapp);
  const whatsappNorm = whatsappRaw
    ? normalizeBangladeshPhone(whatsappRaw)
    : undefined;
  if (whatsappRaw && !whatsappNorm) {
    return NextResponse.json({ error: BD_WHATSAPP_INVALID_MSG_BN }, { status: 400 });
  }

  const areasOk = await prisma.area.count({
    where: { id: { in: areaIds }, isActive: true },
  });
  if (areasOk !== areaIds.length) {
    return NextResponse.json(
      { error: "One or more areaIds are invalid or inactive" },
      { status: 400 },
    );
  }

  const em = (body as { emergencyAvailable?: unknown }).emergencyAvailable;
  const emergencyAvailable = typeof em === "boolean" ? em : false;

  const ia = (body as { isActive?: unknown }).isActive;
  const isActive = typeof ia === "boolean" ? ia : true;

  const notesField = asTrimmedStringLocal((body as { notes?: unknown }).notes);
  const qualification = asTrimmedStringLocal(
    (body as { qualification?: unknown }).qualification,
  );
  const experienceSummary = asTrimmedStringLocal(
    (body as { experienceSummary?: unknown }).experienceSummary,
  );
  const shortBio = asTrimmedStringLocal((body as { shortBio?: unknown }).shortBio);
  const profilePhotoUrl = asTrimmedStringLocal(
    (body as { profilePhotoUrl?: unknown }).profilePhotoUrl,
  );
  const availableTimeText = asTrimmedStringLocal(
    (body as { availableTimeText?: unknown }).availableTimeText,
  );
  const availabilityRaw = asTrimmedStringLocal(
    (body as { availabilityStatus?: unknown }).availabilityStatus,
  );
  const availabilityNorm = availabilityRaw?.toUpperCase();
  const availabilityStatus =
    availabilityNorm === "AVAILABLE" ||
    availabilityNorm === "LIMITED" ||
    availabilityNorm === "OFF"
      ? availabilityNorm
      : undefined;

  const feeParsed = parseDoctorHomeVisitFeesFromBody(body as Record<string, unknown>);
  if (!feeParsed.ok) {
    return NextResponse.json({ error: feeParsed.error }, { status: 400 });
  }
  const effMin =
    feeParsed.homeVisitFeeMin !== undefined ? feeParsed.homeVisitFeeMin : null;
  const effMax =
    feeParsed.homeVisitFeeMax !== undefined ? feeParsed.homeVisitFeeMax : null;
  const feeErr = assertHomeVisitFeesConsistent(effMin, effMax);
  if (feeErr) {
    return NextResponse.json({ error: feeErr }, { status: 400 });
  }

  try {
    const duplicatePhone = await prisma.user.findFirst({
      where: { phone: { in: bangladeshPhoneDatabaseVariants(phone) } },
      select: { id: true },
    });
    if (duplicatePhone) {
      return NextResponse.json(
        { error: "This phone number is already registered" },
        { status: 400 },
      );
    }

    const duplicateEmail = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    if (duplicateEmail) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(passwordRaw, 12);

    const doctor = await prisma.user.create({
      data: {
        name,
        phone,
        email: email.toLowerCase(),
        passwordHash,
        whatsapp: whatsappNorm ?? undefined,
        notes: notesField ?? undefined,
        qualification: qualification ?? undefined,
        experienceSummary: experienceSummary ?? undefined,
        shortBio: shortBio ?? undefined,
        profilePhotoUrl: profilePhotoUrl ?? undefined,
        availableTimeText: availableTimeText ?? undefined,
        availabilityStatus: availabilityStatus ?? undefined,
        ...(feeParsed.homeVisitFeeMin !== undefined
          ? { homeVisitFeeMin: feeParsed.homeVisitFeeMin }
          : {}),
        ...(feeParsed.homeVisitFeeMax !== undefined
          ? { homeVisitFeeMax: feeParsed.homeVisitFeeMax }
          : {}),
        ...(feeParsed.feeNote !== undefined ? { feeNote: feeParsed.feeNote } : {}),
        emergencyAvailable,
        isActive,
        role: UserRole.DOCTOR,
        doctorAreas: {
          create: areaIds.map((areaId) => ({ areaId })),
        },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        whatsapp: true,
        emergencyAvailable: true,
        notes: true,
        isActive: true,
        createdAt: true,
        doctorAreas: {
          select: {
            area: { select: { id: true, slug: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, doctor }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/doctors", err);
    return NextResponse.json(
      { error: "Failed to create doctor" },
      { status: 500 },
    );
  }
}
