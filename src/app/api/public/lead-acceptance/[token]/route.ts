import { NextResponse } from "next/server";

import { LeadStatus } from "@/generated/prisma/enums";
import { formatLeadAnimalDisplay } from "@/lib/lead-display";
import { isLeadStatusTerminal } from "@/lib/lead-workflow";
import { maskBangladeshStylePhoneForWhatsApp } from "@/lib/phone-mask/mask-phone-for-whatsapp";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token: raw } = await context.params;
  const token = decodeURIComponent(raw ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const lead = await prisma.lead.findFirst({
      where: { acceptanceToken: token },
      select: {
        id: true,
        status: true,
        assignedDoctorId: true,
        customerName: true,
        phone: true,
        area: true,
        areaId: true,
        animalKind: true,
        animalType: true,
        serviceRequirement: true,
        problemDetails: true,
        acceptanceLinkOpenedAt: true,
        assignedDoctor: { select: { name: true } },
        selectedArea: { select: { name: true, nameBn: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.lead.updateMany({
      where: { id: lead.id, acceptanceLinkOpenedAt: null },
      data: { acceptanceLinkOpenedAt: new Date() },
    });

    const areaLabel =
      lead.selectedArea?.nameBn?.trim() ||
      lead.selectedArea?.name?.trim() ||
      lead.area?.trim() ||
      "—";
    const animalLabel = formatLeadAnimalDisplay(lead.animalKind, lead.animalType);
    const problemParts = [lead.serviceRequirement.trim()];
    if (lead.problemDetails?.trim()) {
      problemParts.push(lead.problemDetails.trim());
    }
    const problemText = problemParts.join("\n\n");

    const maskedPhone = maskBangladeshStylePhoneForWhatsApp(lead.phone);

    if (isLeadStatusTerminal(lead.status)) {
      return NextResponse.json({
        state: "closed" as const,
        leadId: lead.id,
        status: lead.status,
        summary: {
          customerName: lead.customerName,
          areaLabel,
          animalLabel,
          maskedPhone,
          problemText,
        },
      });
    }

    if (lead.assignedDoctorId != null) {
      return NextResponse.json({
        state: "taken" as const,
        leadId: lead.id,
        message: "Already accepted by another doctor.",
        assignedDoctorName: lead.assignedDoctor?.name ?? null,
        summary: {
          customerName: lead.customerName,
          areaLabel,
          animalLabel,
          maskedPhone,
          problemText,
        },
      });
    }

    if (lead.status !== LeadStatus.NEW) {
      return NextResponse.json({
        state: "closed" as const,
        leadId: lead.id,
        status: lead.status,
        summary: {
          customerName: lead.customerName,
          areaLabel,
          animalLabel,
          maskedPhone,
          problemText,
        },
      });
    }

    return NextResponse.json({
      state: "open" as const,
      leadId: lead.id,
      summary: {
        customerName: lead.customerName,
        areaLabel,
        animalLabel,
        maskedPhone,
        problemText,
      },
    });
  } catch (err) {
    console.error("GET /api/public/lead-acceptance/[token]", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
