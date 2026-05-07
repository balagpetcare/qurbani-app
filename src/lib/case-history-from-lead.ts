import type { AnimalKind, ServiceAreaZone } from "@/generated/prisma/enums";
import { AnimalKind as AnimalKindEnum } from "@/generated/prisma/enums";
import type { Area, Lead, LeadCaseReport } from "@/generated/prisma/client";

import {
  CASE_HISTORY_BODY_MAX,
  CASE_HISTORY_FIELD_MAX,
  CASE_HISTORY_SUMMARY_MAX,
  CASE_HISTORY_TITLE_MAX,
  areaBucketFromServiceZone,
  containsLikelyPII,
  isAllowedPublicAreaBucket,
  mediaUrlsToDbJson,
  parseAnimalKind,
  parseHttpsUrlList,
  requireNonEmptyText,
  validateOptionalLongText,
} from "@/lib/case-history-validation";
import { formatLeadProblemCategory } from "@/lib/lead-display";

export type LeadForPublicCaseSubmit = Lead & {
  selectedArea: Pick<Area, "zone"> | null;
};

function composeProblemSummary(lead: Lead): string {
  const cat = formatLeadProblemCategory(lead.problemCategory);
  const detail = lead.problemDetails?.trim();
  const svc = lead.serviceRequirement?.trim();
  const parts = [cat, detail, svc].filter(Boolean) as string[];
  return parts.join(" — ").slice(0, CASE_HISTORY_FIELD_MAX);
}

function safeProblemSummary(lead: Lead): { ok: true; value: string } | { ok: false; message: string } {
  const full = composeProblemSummary(lead);
  if (!containsLikelyPII(full)) return { ok: true, value: full };
  const reduced = [formatLeadProblemCategory(lead.problemCategory), lead.serviceRequirement?.trim()]
    .filter(Boolean)
    .join(" — ")
    .slice(0, CASE_HISTORY_FIELD_MAX);
  if (!containsLikelyPII(reduced)) return { ok: true, value: reduced };
  return {
    ok: false,
    message:
      "সমস্যার বিবরণে গ্রাহকের যোগাযোগ বা সনাক্তকরণযোগ্য তথ্য সন্দেহজনক। দয়া করে JSON বডিতে problemSummaryBn পাঠিয়ে সাধারণ ভাষায় পুনরায় লিখুন।",
  };
}

export type ParsedCaseHistorySubmitBody = {
  titleBn: string;
  summaryBn: string | null;
  bodyBn: string | null;
  problemSummaryBn: string;
  diagnosisSummaryBn: string | null;
  treatmentSummaryBn: string | null;
  resultSummaryBn: string | null;
  areaBucket: string;
  animalKind: AnimalKind | null;
  animalTypeLabelBn: string | null;
  mediaUrlsJson: string | null;
  posterImageUrl: string | null;
};

export function parseCaseHistorySubmitFromLead(
  lead: LeadForPublicCaseSubmit,
  caseReport: LeadCaseReport,
  body: Record<string, unknown>,
): { ok: true; value: ParsedCaseHistorySubmitBody } | { ok: false; message: string } {
  const zone: ServiceAreaZone | null | undefined = lead.selectedArea?.zone ?? undefined;
  const defaultArea = areaBucketFromServiceZone(zone);

  const titleRaw = body.titleBn ?? caseReport.showcaseTitle ?? "পাবলিক কেস ইতিহাস";
  const title = requireNonEmptyText(titleRaw, CASE_HISTORY_TITLE_MAX, "শিরোনাম");
  if (!title.ok) return title;

  const summaryParsed = validateOptionalLongText(
    body.summaryBn ?? caseReport.showcaseSummary,
    CASE_HISTORY_SUMMARY_MAX,
    "সারাংশ",
  );
  if (!summaryParsed.ok) return summaryParsed;

  const bodyParsed = validateOptionalLongText(body.bodyBn, CASE_HISTORY_BODY_MAX, "বিস্তারিত");
  if (!bodyParsed.ok) return bodyParsed;

  let problemSummaryBn: string;
  if (body.problemSummaryBn !== undefined && body.problemSummaryBn !== null) {
    const p = requireNonEmptyText(body.problemSummaryBn, CASE_HISTORY_FIELD_MAX, "সমস্যার সারাংশ");
    if (!p.ok) return p;
    problemSummaryBn = p.value;
  } else {
    const auto = safeProblemSummary(lead);
    if (!auto.ok) return auto;
    problemSummaryBn = auto.value;
  }

  const diagRaw = body.diagnosisSummaryBn ?? caseReport.diagnosis ?? null;
  const diag = validateOptionalLongText(diagRaw, CASE_HISTORY_FIELD_MAX, "নির্ণয়ের সারাংশ");
  if (!diag.ok) return diag;

  const treatRaw = body.treatmentSummaryBn ?? caseReport.treatmentGiven ?? null;
  const treat = requireNonEmptyText(treatRaw ?? "", CASE_HISTORY_FIELD_MAX, "চিকিৎসার সারাংশ");
  if (!treat.ok) return treat;

  const result = validateOptionalLongText(body.resultSummaryBn, CASE_HISTORY_FIELD_MAX, "ফলাফল");
  if (!result.ok) return result;

  const areaRaw = typeof body.areaBucket === "string" && body.areaBucket.trim() ? body.areaBucket : defaultArea;
  const areaBucket = areaRaw.trim();
  if (!isAllowedPublicAreaBucket(areaBucket)) {
    return { ok: false, message: "এলাকার লেবেল অননুমোদিত।" };
  }

  let animalKind: AnimalKind | null = lead.animalKind ?? null;
  const ak = parseAnimalKind(body.animalKind);
  if (ak === null && body.animalKind !== undefined && body.animalKind !== null) {
    return { ok: false, message: "প্রাণীর ধরন সঠিক নয়।" };
  }
  if (ak !== undefined) animalKind = ak ?? null;

  let animalTypeLabelBn: string | null = null;
  if (animalKind === AnimalKindEnum.OTHER) {
    const label = validateOptionalLongText(
      body.animalTypeLabelBn ?? lead.animalType,
      120,
      "প্রাণীর ধরন (অন্যান্য)",
    );
    if (!label.ok) return label;
    if (!label.value || label.value.length < 2) {
      return { ok: false, message: "প্রাণী ‘অন্যান্য’ হলে সংক্ষিপ্ত ধরন লিখুন।" };
    }
    animalTypeLabelBn = label.value;
  }

  const media = parseHttpsUrlList(body.mediaUrls);
  if (!media.ok) return media;

  let posterImageUrl: string | null = null;
  if (body.posterImageUrl != null) {
    if (typeof body.posterImageUrl !== "string") {
      return { ok: false, message: "posterImageUrl স্ট্রিং হতে হবে।" };
    }
    const p = body.posterImageUrl.trim();
    if (p && !p.startsWith("https://")) {
      return { ok: false, message: "পোস্টার ছবির লিংক শুধু https:// হতে হবে।" };
    }
    posterImageUrl = p || null;
    if (posterImageUrl && containsLikelyPII(posterImageUrl)) {
      return { ok: false, message: "পোস্টার লিংক সন্দেহজনক।" };
    }
  }

  return {
    ok: true,
    value: {
      titleBn: title.value,
      summaryBn: summaryParsed.value,
      bodyBn: bodyParsed.value,
      problemSummaryBn,
      diagnosisSummaryBn: diag.value,
      treatmentSummaryBn: treat.value,
      resultSummaryBn: result.value,
      areaBucket,
      animalKind,
      animalTypeLabelBn,
      mediaUrlsJson: mediaUrlsToDbJson(media.value),
      posterImageUrl,
    },
  };
}
