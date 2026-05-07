import { NextResponse } from "next/server";

import { ServiceAreaZone } from "@/generated/prisma/enums";
import { slugifyAreaLabel } from "@/lib/area-slug";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { asTrimmedString } from "@/lib/validators";

function parseZone(raw: unknown): ServiceAreaZone | null | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  return (Object.values(ServiceAreaZone) as string[]).includes(v)
    ? (v as ServiceAreaZone)
    : undefined;
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
  const b = body as Record<string, unknown>;

  const nameBn = asTrimmedString(b.nameBn);
  if (!nameBn || nameBn.length > 200) {
    return NextResponse.json(
      {
        error: "nameBn is required",
        messageBn: "বাংলা নাম লিখুন।",
      },
      { status: 400 },
    );
  }

  const nameTrim = asTrimmedString(b.name);
  const fallbackRoman = slugifyAreaLabel(nameBn).replace(/-/g, " ");
  const name =
    nameTrim && nameTrim.length > 0
      ? nameTrim.slice(0, 200)
      : (fallbackRoman || nameBn).slice(0, 200);

  const nameEnRaw = asTrimmedString(b.nameEn);

  const zoneParsed = parseZone(b.zone);
  if (b.zone != null && b.zone !== "" && zoneParsed === undefined) {
    return NextResponse.json(
      { error: "Invalid zone", messageBn: "জোন সঠিক নয়।" },
      { status: 400 },
    );
  }

  let slug = asTrimmedString(b.slug) ?? slugifyAreaLabel(nameBn);
  if (!slug) slug = `area-${Date.now()}`;

  const isPopular = Boolean(b.isPopular);

  let sortOrder = 0;
  if (typeof b.sortOrder === "number" && Number.isInteger(b.sortOrder)) {
    sortOrder = b.sortOrder;
  } else if (typeof b.sortOrder === "string") {
    const n = parseInt(b.sortOrder.trim(), 10);
    if (!Number.isNaN(n)) sortOrder = n;
  }

  const note = asTrimmedString(b.note);

  let candidate = slug;
  let suf = 1;
  while (
    await prisma.area.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
  ) {
    suf += 1;
    candidate = `${slug}-${suf}`;
  }

  try {
    const created = await prisma.area.create({
      data: {
        slug: candidate,
        name,
        nameBn,
        nameEn: nameEnRaw ?? null,
        zone: zoneParsed ?? null,
        isPopular,
        sortOrder,
        note: note ?? null,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        nameBn: true,
        nameEn: true,
        zone: true,
        isPopular: true,
        sortOrder: true,
        isActive: true,
      },
    });
    return NextResponse.json({ area: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/areas", err);
    return NextResponse.json(
      { error: "Failed to create area", messageBn: "এলাকা তৈরি করা যায়নি।" },
      { status: 500 },
    );
  }
}
