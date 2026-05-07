import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  publicCustomerAreaOrderBy,
  publicCustomerAreaWhere,
} from "@/lib/public-areas";

export async function GET() {
  try {
    const areas = await prisma.area.findMany({
      where: publicCustomerAreaWhere,
      orderBy: publicCustomerAreaOrderBy,
      select: {
        id: true,
        slug: true,
        name: true,
        nameBn: true,
        nameEn: true,
        isPopular: true,
        zone: true,
      },
    });
    return NextResponse.json({ areas });
  } catch (err) {
    console.error("GET /api/areas", err);
    return NextResponse.json({ error: "Failed to load areas" }, { status: 500 });
  }
}
