import { NextResponse } from "next/server";

import { requireAdminFromRequest } from "@/lib/auth-guards";
import { formatLeadAnimalDisplay } from "@/lib/lead-display";
import { ensureLeadAcceptanceToken } from "@/lib/lead/acceptance-token";
import { logOps } from "@/lib/ops-log";
import { prisma } from "@/lib/prisma";
import { getPublicAppUrl } from "@/lib/server/sms/sms-env";
import { formatQuarbaniWhatsAppLeadMessage } from "@/lib/whatsapp-dispatch/format-quarbani-whatsapp-lead-message";

type RouteContext = { params: Promise<{ id: string }> };

function clientIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first.slice(0, 45);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 45);
  return null;
}

function clientUa(request: Request): string | null {
  const ua = request.headers.get("user-agent");
  if (!ua) return null;
  return ua.length > 512 ? ua.slice(0, 512) : ua;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { id: idParam } = await context.params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { selectedArea: { select: { name: true, nameBn: true } } },
    });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const token = await ensureLeadAcceptanceToken(prisma, id);
    const base = getPublicAppUrl();
    const path = `/accept-lead/${encodeURIComponent(token)}`;
    const acceptanceUrl = base ? `${base}${path}` : path;

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

    const message = formatQuarbaniWhatsAppLeadMessage({
      leadId: lead.id,
      customerName: lead.customerName,
      areaLabel,
      animalLabel,
      rawPhone: lead.phone,
      problemText,
      acceptanceUrl,
    });

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.leadWhatsAppCopyLog.create({
        data: {
          leadId: id,
          adminUserId: auth.userId,
          ipAddress: clientIp(request),
          userAgent: clientUa(request),
        },
      });
      await tx.lead.update({
        where: { id },
        data: {
          whatsappCopiedAt: lead.whatsappCopiedAt ?? now,
        },
      });
    });

    logOps("admin_whatsapp_lead_dispatch_copy", {
      leadId: id,
      adminUserId: auth.userId,
    });

    return NextResponse.json({
      success: true,
      message,
      acceptanceUrl,
      whatsappCopiedAt: (lead.whatsappCopiedAt ?? now).toISOString(),
    });
  } catch (err) {
    console.error("POST /api/admin/leads/[id]/whatsapp-dispatch/copy", err);
    return NextResponse.json(
      { error: "Failed to prepare WhatsApp message" },
      { status: 500 },
    );
  }
}
