import { NextResponse } from "next/server";

import { ServiceAreaZone } from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { asTrimmedString } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

function parseZone(raw: unknown): ServiceAreaZone | null | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") return undefined;
  const v = raw.trim();
  return (Object.values(ServiceAreaZone) as string[]).includes(v)
    ? (v as ServiceAreaZone)
    : undefined;
}

export async function PATCH(request: Request, context: Ctx) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: raw } = await context.params;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id) || id < 1) {
    return NextResponse.json({ error: "Invalid area id" }, { status: 400 });
  }

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
  const data: Record<string, unknown> = {};

  if ("name" in b) {
    const t = asTrimmedString(b.name);
    if (!t) {
      return NextResponse.json(
        { error: "name required", messageBn: "নাম খালি রাখা যাবে না।" },
        { status: 400 },
      );
    }
    data.name = t.slice(0, 200);
  }
  if ("nameBn" in b) {
    const t = asTrimmedString(b.nameBn);
    data.nameBn = t ?? null;
  }
  if ("nameEn" in b) {
    data.nameEn = asTrimmedString(b.nameEn) ?? null;
  }
  if ("zone" in b) {
    if (b.zone === null) {
      data.zone = null;
    } else {
      const z = parseZone(b.zone);
      if (z === undefined) {
        return NextResponse.json(
          { error: "Invalid zone", messageBn: "জোন সঠিক নয়।" },
          { status: 400 },
        );
      }
      data.zone = z;
    }
  }
  if ("isPopular" in b) {
    if (typeof b.isPopular !== "boolean") {
      return NextResponse.json({ error: "isPopular must be boolean" }, { status: 400 });
    }
    data.isPopular = b.isPopular;
  }
  if ("isActive" in b) {
    if (typeof b.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be boolean" }, { status: 400 });
    }
    data.isActive = b.isActive;
  }
  if ("sortOrder" in b) {
    const n = typeof b.sortOrder === "number" ? b.sortOrder : parseInt(String(b.sortOrder), 10);
    if (!Number.isInteger(n)) {
      return NextResponse.json({ error: "sortOrder must be integer" }, { status: 400 });
    }
    data.sortOrder = n;
  }
  if ("note" in b) {
    data.note = asTrimmedString(b.note) ?? null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  try {
    const updated = await prisma.area.update({
      where: { id },
      data,
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
        note: true,
      },
    });
    return NextResponse.json({ area: updated });
  } catch {
    return NextResponse.json({ error: "Area not found" }, { status: 404 });
  }
}

export async function DELETE(request: Request, context: Ctx) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: raw } = await context.params;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id) || id < 1) {
    return NextResponse.json({ error: "Invalid area id" }, { status: 400 });
  }

  const row = await prisma.area.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          doctors: true,
          leads: true,
          applications: true,
        },
      },
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Area not found" }, { status: 404 });
  }

  const n = row._count.doctors + row._count.leads + row._count.applications;
  if (n > 0) {
    return NextResponse.json(
      {
        error: "AREA_IN_USE",
        messageBn:
          "এই এলাকায় লিড বা ডাক্তার/আবেদন আছে। মুছতে পারবেন না — নিষ্ক্রিয় করুন।",
      },
      { status: 409 },
    );
  }

  await prisma.area.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
