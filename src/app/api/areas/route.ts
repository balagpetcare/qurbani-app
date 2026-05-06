import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const areas = await prisma.area.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        nameBn: true,
      },
    });
    return NextResponse.json({ areas });
  } catch (err) {
    console.error("GET /api/areas", err);
    return NextResponse.json({ error: "Failed to load areas" }, { status: 500 });
  }
}
