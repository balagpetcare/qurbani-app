import { NextResponse } from "next/server";

import { AnimalKind as AnimalKindEnum, PublicCaseHistoryStatus } from "@/generated/prisma/enums";
import { requireAdminFromRequest } from "@/lib/auth-guards";
import {
  CASE_HISTORY_BODY_MAX,
  CASE_HISTORY_FIELD_MAX,
  CASE_HISTORY_SUMMARY_MAX,
  CASE_HISTORY_TITLE_MAX,
  isAllowedPublicAreaBucket,
  mediaUrlsToDbJson,
  parseAnimalKind,
  parseHttpsUrlList,
  requireNonEmptyText,
  validateOptionalLongText,
} from "@/lib/case-history-validation";
import { prisma } from "@/lib/prisma";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteCtx) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const id = Number.parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) body = raw as Record<string, unknown>;
  } catch {
    body = {};
  }

  const row = await prisma.publicCaseHistory.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      titleBn: true,
      summaryBn: true,
      bodyBn: true,
      problemSummaryBn: true,
      diagnosisSummaryBn: true,
      treatmentSummaryBn: true,
      resultSummaryBn: true,
      areaBucket: true,
      animalKind: true,
      animalTypeLabelBn: true,
      mediaUrls: true,
      posterImageUrl: true,
    },
  });

  if (!row || row.status !== PublicCaseHistoryStatus.PENDING_APPROVAL) {
    return NextResponse.json(
      { error: "Case history not pending approval." },
      { status: 409 },
    );
  }

  let titleBn = row.titleBn;
  if (body.titleBn !== undefined) {
    const t = requireNonEmptyText(body.titleBn, CASE_HISTORY_TITLE_MAX, "শিরোনাম");
    if (!t.ok) return NextResponse.json({ error: t.message }, { status: 400 });
    titleBn = t.value;
  }

  let summaryBn = row.summaryBn;
  if (body.summaryBn !== undefined) {
    const s = validateOptionalLongText(body.summaryBn, CASE_HISTORY_SUMMARY_MAX, "সারাংশ");
    if (!s.ok) return NextResponse.json({ error: s.message }, { status: 400 });
    summaryBn = s.value;
  }

  let bodyBn = row.bodyBn;
  if (body.bodyBn !== undefined) {
    const b = validateOptionalLongText(body.bodyBn, CASE_HISTORY_BODY_MAX, "বিস্তারিত");
    if (!b.ok) return NextResponse.json({ error: b.message }, { status: 400 });
    bodyBn = b.value;
  }

  let problemSummaryBn = row.problemSummaryBn;
  if (body.problemSummaryBn !== undefined) {
    const p = requireNonEmptyText(body.problemSummaryBn, CASE_HISTORY_FIELD_MAX, "সমস্যার সারাংশ");
    if (!p.ok) return NextResponse.json({ error: p.message }, { status: 400 });
    problemSummaryBn = p.value;
  }

  let diagnosisSummaryBn = row.diagnosisSummaryBn;
  if (body.diagnosisSummaryBn !== undefined) {
    const d = validateOptionalLongText(body.diagnosisSummaryBn, CASE_HISTORY_FIELD_MAX, "নির্ণয়ের সারাংশ");
    if (!d.ok) return NextResponse.json({ error: d.message }, { status: 400 });
    diagnosisSummaryBn = d.value;
  }

  let treatmentSummaryBn = row.treatmentSummaryBn;
  if (body.treatmentSummaryBn !== undefined) {
    const t = requireNonEmptyText(body.treatmentSummaryBn, CASE_HISTORY_FIELD_MAX, "চিকিৎসার সারাংশ");
    if (!t.ok) return NextResponse.json({ error: t.message }, { status: 400 });
    treatmentSummaryBn = t.value;
  }

  let resultSummaryBn = row.resultSummaryBn;
  if (body.resultSummaryBn !== undefined) {
    const r = validateOptionalLongText(body.resultSummaryBn, CASE_HISTORY_FIELD_MAX, "ফলাফল");
    if (!r.ok) return NextResponse.json({ error: r.message }, { status: 400 });
    resultSummaryBn = r.value;
  }

  let areaBucket = row.areaBucket;
  if (body.areaBucket !== undefined) {
    if (typeof body.areaBucket !== "string" || !isAllowedPublicAreaBucket(body.areaBucket)) {
      return NextResponse.json({ error: "Invalid areaBucket" }, { status: 400 });
    }
    areaBucket = body.areaBucket.trim();
  }

  let animalKind = row.animalKind;
  if (body.animalKind !== undefined) {
    if (body.animalKind === null) {
      animalKind = null;
    } else {
      const ak = parseAnimalKind(body.animalKind);
      if (ak === null || ak === undefined) {
        return NextResponse.json({ error: "Invalid animalKind" }, { status: 400 });
      }
      animalKind = ak;
    }
  }

  let animalTypeLabelBn = row.animalTypeLabelBn;
  if (body.animalTypeLabelBn !== undefined) {
    const l = validateOptionalLongText(body.animalTypeLabelBn, 120, "প্রাণীর ধরন");
    if (!l.ok) return NextResponse.json({ error: l.message }, { status: 400 });
    animalTypeLabelBn = l.value;
  }
  if (animalKind === AnimalKindEnum.OTHER && (!animalTypeLabelBn || animalTypeLabelBn.length < 2)) {
    return NextResponse.json(
      { error: "OTHER animal kind requires animalTypeLabelBn" },
      { status: 400 },
    );
  }

  let mediaUrls = row.mediaUrls;
  if (body.mediaUrls !== undefined) {
    const m = parseHttpsUrlList(body.mediaUrls);
    if (!m.ok) return NextResponse.json({ error: m.message }, { status: 400 });
    mediaUrls = mediaUrlsToDbJson(m.value);
  }

  let posterImageUrl = row.posterImageUrl;
  if (body.posterImageUrl !== undefined) {
    if (body.posterImageUrl === null) {
      posterImageUrl = null;
    } else if (typeof body.posterImageUrl === "string") {
      const p = body.posterImageUrl.trim();
      if (p && !p.startsWith("https://")) {
        return NextResponse.json({ error: "posterImageUrl must be https" }, { status: 400 });
      }
      posterImageUrl = p || null;
    } else {
      return NextResponse.json({ error: "Invalid posterImageUrl" }, { status: 400 });
    }
  }

  const updated = await prisma.publicCaseHistory.update({
    where: { id: row.id },
    data: {
      status: PublicCaseHistoryStatus.PUBLISHED,
      publishedAt: new Date(),
      reviewedByUserId: auth.userId,
      rejectionReason: null,
      rejectedAt: null,
      titleBn,
      summaryBn,
      bodyBn,
      problemSummaryBn,
      diagnosisSummaryBn,
      treatmentSummaryBn,
      resultSummaryBn,
      areaBucket,
      animalKind,
      animalTypeLabelBn,
      mediaUrls,
      posterImageUrl,
    },
    select: {
      id: true,
      status: true,
      publishedAt: true,
    },
  });

  return NextResponse.json({ caseHistory: updated });
}
