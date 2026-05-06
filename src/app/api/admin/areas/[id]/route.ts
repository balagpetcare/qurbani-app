import { NextResponse } from "next/server";

import { requireAdminFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { asTrimmedString } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

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
  const data: {
    isActive?: boolean;
    sortOrder?: number;
    nameBn?: string | null;
  } = {};

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
  if ("nameBn" in b) {
    const t = asTrimmedString(b.nameBn);
    data.nameBn = t ?? null;
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
        sortOrder: true,
        isActive: true,
      },
    });
    return NextResponse.json({ area: updated });
  } catch {
    return NextResponse.json({ error: "Area not found" }, { status: 404 });
  }
}
