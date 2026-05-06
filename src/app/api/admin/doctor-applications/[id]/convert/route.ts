import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { DoctorApplicationStatus, UserRole } from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  bangladeshPhoneDatabaseVariants,
  BD_PHONE_INVALID_MSG_BN,
  BD_WHATSAPP_INVALID_MSG_BN,
  normalizeBangladeshPhone,
} from "@/lib/phone";
import { asTrimmedString, parsePositiveIntIds } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

function buildDoctorProfileNotes(app: {
  shortBio: string | null;
  animalExpertise: string | null;
  availableTimeText: string | null;
  ownTransport: boolean;
  expectedVisitCharge: number | null;
  certificateUrl: string | null;
  note: string | null;
  qualification: string | null;
  experience: string | null;
}): string | undefined {
  const parts: string[] = [];
  if (app.shortBio?.trim()) parts.push(app.shortBio.trim());
  if (app.qualification?.trim()) {
    parts.push(`যোগ্যতা: ${app.qualification.trim()}`);
  }
  if (app.experience?.trim()) {
    parts.push(`অভিজ্ঞতা: ${app.experience.trim()}`);
  }
  if (app.animalExpertise?.trim()) {
    parts.push(`পশু বিশেষজ্ঞতা: ${app.animalExpertise.trim()}`);
  }
  if (app.availableTimeText?.trim()) {
    parts.push(`উপলব্ধ সময়: ${app.availableTimeText.trim()}`);
  }
  parts.push(app.ownTransport ? "নিজস্ব পরিবহন: হ্যাঁ" : "নিজস্ব পরিবহন: না");
  if (app.expectedVisitCharge != null) {
    parts.push(`প্রত্যাশিত ভিজিট চার্জ (৳): ${app.expectedVisitCharge}`);
  }
  if (app.certificateUrl?.trim()) {
    parts.push(`সনদ/ডকুমেন্ট URL: ${app.certificateUrl.trim()}`);
  }
  if (app.note?.trim()) parts.push(`আবেদন নোট: ${app.note.trim()}`);
  return parts.length ? parts.join("\n\n") : undefined;
}

export async function POST(request: Request, context: RouteContext) {
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

  const password =
    typeof body.password === "string" ? body.password : "";
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "password is required (min 8 characters)" },
      { status: 400 },
    );
  }

  const overrideAreaIds = [...new Set(parsePositiveIntIds(body.areaIds))];

  try {
    const user = await prisma.$transaction(async (tx) => {
      const application = await tx.doctorApplication.findUnique({
        where: { id },
        include: {
          areas: { select: { areaId: true } },
        },
      });

      if (!application) {
        throw new Error("NOT_FOUND");
      }

      if (application.status === DoctorApplicationStatus.CONVERTED_TO_DOCTOR) {
        throw new Error("ALREADY_CONVERTED");
      }

      if (application.status !== DoctorApplicationStatus.APPROVED) {
        throw new Error("NOT_APPROVED");
      }

      const phoneNorm = asTrimmedString(body.phone)
        ? normalizeBangladeshPhone(String(body.phone))
        : normalizeBangladeshPhone(application.phone);

      if (!phoneNorm) {
        throw new Error("BAD_PHONE");
      }

      const emailRaw =
        asTrimmedString(body.email) ?? application.email?.toLowerCase();
      if (!emailRaw) {
        throw new Error("NO_EMAIL");
      }
      const email = emailRaw.toLowerCase();

      const dupPhone = await tx.user.findFirst({
        where: { phone: { in: bangladeshPhoneDatabaseVariants(phoneNorm) } },
        select: { id: true },
      });
      if (dupPhone) {
        throw new Error("DUP_PHONE");
      }

      const dupEmail = await tx.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      });
      if (dupEmail) {
        throw new Error("DUP_EMAIL");
      }

      const whatsappRaw =
        asTrimmedString(body.whatsapp) ?? application.whatsapp;
      const whatsappNorm = whatsappRaw
        ? normalizeBangladeshPhone(whatsappRaw)
        : undefined;
      if (whatsappRaw && !whatsappNorm) {
        throw new Error("BAD_WA");
      }

      let areaIds = application.areas.map((a) => a.areaId);
      if (overrideAreaIds.length > 0) {
        const cnt = await tx.area.count({
          where: { id: { in: overrideAreaIds }, isActive: true },
        });
        if (cnt !== overrideAreaIds.length) {
          throw new Error("BAD_AREAS");
        }
        await tx.doctorApplicationArea.deleteMany({
          where: { applicationId: id },
        });
        await tx.doctorApplicationArea.createMany({
          data: overrideAreaIds.map((areaId) => ({
            applicationId: id,
            areaId,
          })),
        });
        areaIds = overrideAreaIds;
      }

      if (areaIds.length === 0) {
        throw new Error("NO_AREAS");
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const notes = buildDoctorProfileNotes(application);

      const u = await tx.user.create({
        data: {
          name: application.name,
          phone: phoneNorm,
          email,
          passwordHash,
          whatsapp: whatsappNorm ?? undefined,
          role: UserRole.DOCTOR,
          isActive: true,
          emergencyAvailable: application.emergencyAvailable,
          notes,
          ...(application.expectedVisitCharge != null &&
          application.expectedVisitCharge > 0
            ? { homeVisitFeeMin: application.expectedVisitCharge }
            : {}),
          doctorAreas: {
            create: areaIds.map((areaId) => ({ areaId })),
          },
        },
      });

      await tx.doctorApplication.update({
        where: { id },
        data: {
          status: DoctorApplicationStatus.CONVERTED_TO_DOCTOR,
          convertedUserId: u.id,
          reviewedAt: new Date(),
          reviewedByUserId: auth.userId,
        },
      });

      return u;
    });

    const doctor = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        doctorAreas: {
          select: {
            area: { select: { id: true, slug: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json(
      { success: true, doctor, applicationId: id },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error) {
      const m = err.message;
      if (m === "NOT_FOUND") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (m === "ALREADY_CONVERTED") {
        return NextResponse.json({ error: "Already converted" }, { status: 400 });
      }
      if (m === "NOT_APPROVED") {
        return NextResponse.json(
          {
            error:
              "আবেদন অনুমোদিত হওয়ার পরই ডাক্তার অ্যাকাউন্ট তৈরি করুন (Approve করুন)।",
          },
          { status: 400 },
        );
      }
      if (m === "BAD_PHONE") {
        return NextResponse.json(
          { error: BD_PHONE_INVALID_MSG_BN },
          { status: 400 },
        );
      }
      if (m === "NO_EMAIL") {
        return NextResponse.json(
          { error: "Application must have email or provide email in body" },
          { status: 400 },
        );
      }
      if (m === "DUP_PHONE") {
        return NextResponse.json(
          { error: "A user with this phone already exists" },
          { status: 400 },
        );
      }
      if (m === "DUP_EMAIL") {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 400 },
        );
      }
      if (m === "BAD_WA") {
        return NextResponse.json(
          { error: BD_WHATSAPP_INVALID_MSG_BN },
          { status: 400 },
        );
      }
      if (m === "BAD_AREAS") {
        return NextResponse.json(
          { error: "One or more areaIds are invalid or inactive" },
          { status: 400 },
        );
      }
      if (m === "NO_AREAS") {
        return NextResponse.json(
          { error: "Application has no areas — add areas before convert" },
          { status: 400 },
        );
      }
    }
    console.error("POST /api/admin/doctor-applications/[id]/convert", err);
    return NextResponse.json(
      { error: "Failed to convert application" },
      { status: 500 },
    );
  }
}
