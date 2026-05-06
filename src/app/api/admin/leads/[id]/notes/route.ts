import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length ? t : undefined;
}

export async function POST(request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
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

  const noteText = asTrimmedString((body as { note?: unknown }).note);
  if (!noteText) {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }

  const createdBy = asTrimmedString((body as { createdBy?: unknown }).createdBy);

  try {
    const leadExists = await prisma.lead.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!leadExists) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const row = await prisma.leadNote.create({
      data: {
        leadId: id,
        note: noteText,
        createdBy: createdBy ?? undefined,
      },
      select: {
        id: true,
        note: true,
        createdBy: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        note: {
          id: row.id,
          note: row.note,
          createdBy: row.createdBy,
          createdAt: row.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/admin/leads/[id]/notes", err);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}
