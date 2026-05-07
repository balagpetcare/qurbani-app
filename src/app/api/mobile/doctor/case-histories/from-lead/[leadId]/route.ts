import { NextResponse } from "next/server";

import { PublicCaseHistoryStatus } from "@/generated/prisma/enums";
import { parseCaseHistorySubmitFromLead } from "@/lib/case-history-from-lead";
import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { assertDoctorCaseHistoryWriteAllowed } from "@/lib/public-rate-limit";

type RouteCtx = { params: Promise<{ leadId: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  const rl = assertDoctorCaseHistoryWriteAllowed(request, auth.user.id);
  if (rl) return rl;

  const leadId = Number.parseInt((await ctx.params).leadId, 10);
  if (!Number.isFinite(leadId)) {
    return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) body = raw as Record<string, unknown>;
  } catch {
    body = {};
  }

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      selectedArea: { select: { zone: true } },
      caseReport: true,
      caseBilling: true,
      publicCaseHistory: { select: { id: true, status: true } },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "লিড পাওয়া যায়নি।", messageBn: "লিড পাওয়া যায়নি।" }, { status: 404 });
  }
  if (lead.assignedDoctorId !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden", messageBn: "আপনার জন্য অনুমোদিত নয়।" }, { status: 403 });
  }
  if (!lead.caseBilling || !lead.caseReport?.completedAt) {
    return NextResponse.json(
      {
        error: "Case not completed",
        messageBn: "প্রথমে চিকিৎসা সমাপ্তি ও বিলিং সম্পন্ন করুন।",
      },
      { status: 400 },
    );
  }
  if (lead.caseBilling.doctorId !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden", messageBn: "আপনার জন্য অনুমোদিত নয়।" }, { status: 403 });
  }
  if (!lead.caseReport.publicShowcaseEligible) {
    return NextResponse.json(
      {
        error: "Showcase not eligible",
        messageBn: "সমাপ্তির সময় পাবলিক শোকেস চালু করা হয়নি।",
      },
      { status: 400 },
    );
  }

  const existing = lead.publicCaseHistory;
  if (existing?.status === PublicCaseHistoryStatus.PENDING_APPROVAL) {
    return NextResponse.json(
      { error: "Already pending", messageBn: "ইতিমধ্যে পর্যালোচনায় আছে।" },
      { status: 409 },
    );
  }
  if (existing?.status === PublicCaseHistoryStatus.PUBLISHED) {
    return NextResponse.json(
      { error: "Already published", messageBn: "ইতিমধ্যে প্রকাশিত।" },
      { status: 409 },
    );
  }

  const parsed = parseCaseHistorySubmitFromLead(
    { ...lead, selectedArea: lead.selectedArea },
    lead.caseReport,
    body,
  );
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message, messageBn: parsed.message }, { status: 400 });
  }
  const v = parsed.value;
  const now = new Date();

  const data = {
    sourceLeadId: leadId,
    sourceCaseReportId: lead.caseReport.id,
    authorDoctorUserId: auth.user.id,
    status: PublicCaseHistoryStatus.PENDING_APPROVAL,
    titleBn: v.titleBn,
    summaryBn: v.summaryBn,
    bodyBn: v.bodyBn,
    animalKind: v.animalKind,
    animalTypeLabelBn: v.animalTypeLabelBn,
    problemSummaryBn: v.problemSummaryBn,
    diagnosisSummaryBn: v.diagnosisSummaryBn,
    treatmentSummaryBn: v.treatmentSummaryBn,
    resultSummaryBn: v.resultSummaryBn,
    areaBucket: v.areaBucket,
    mediaUrls: v.mediaUrlsJson,
    posterImageUrl: v.posterImageUrl,
    submittedAt: now,
    rejectedAt: null,
    rejectionReason: null,
    publishedAt: null,
  };

  const row = existing
    ? await prisma.publicCaseHistory.update({
        where: { id: existing.id },
        data,
        select: { id: true, status: true, submittedAt: true },
      })
    : await prisma.publicCaseHistory.create({
        data,
        select: { id: true, status: true, submittedAt: true },
      });

  return NextResponse.json({ publicCaseHistory: row }, { status: existing ? 200 : 201 });
}
