/**
 * Whitelist mapping for doctor data shown on public routes.
 * Never spread full `User` rows into public UI — use {@link toPublicDoctorCard}.
 */

/** Inferred from public text for landing filters (no new API surface). */
export type PublicDoctorAnimalFocusSlug = "cow" | "goat" | "buffalo" | "sheep";

export type PublicDoctorCard = {
  id: number;
  name: string;
  areaLabel: string;
  experienceBlurb: string;
  completedCount: number;
  profilePhotoUrl: string | null;
  qualification: string | null;
  shortBio: string | null;
  availabilityLabel?: string;
  ratingLabel?: string;
  /** Raw `User.availabilityStatus` (AVAILABLE | LIMITED | OFF) for UI + future realtime. */
  availabilityStatusCode?: string | null;
  homeVisitFeeMin: number | null;
  homeVisitFeeMax: number | null;
  feeNote: string | null;
  /** Preformatted for cards (Bengali numerals where supported). */
  feeLineBn: string;
  /** Public schedule blurb when set by admin (directory / detail). */
  availableTimeText?: string;
  /** First linked service area id for `/request?area=` deep links. */
  primaryAreaId?: number | null;
  /** All linked public service area ids (landing filters). */
  serviceAreaIds?: number[];
  /** Short “X+ বছর” from public profile text when parsable. */
  yearsExperienceBn?: string | null;
  /** Keyword-derived species focus for client filters. */
  animalFocusSlugs?: readonly PublicDoctorAnimalFocusSlug[];
};

type AreaNameRow = { area: { id: number; name: string; nameBn: string | null } };

type DoctorPublicRow = {
  id: number;
  name: string;
  experienceSummary: string | null;
  profilePhotoUrl: string | null;
  qualification: string | null;
  shortBio: string | null;
  availabilityStatus: string | null;
  homeVisitFeeMin: number | null;
  homeVisitFeeMax: number | null;
  feeNote: string | null;
  doctorAreas: AreaNameRow[];
  availableTimeText: string | null;
};

function availabilityBn(code: string | null | undefined): string | undefined {
  if (!code?.trim()) return undefined;
  const c = code.trim().toUpperCase();
  if (c === "AVAILABLE") return "উপলব্ধ";
  if (c === "LIMITED") return "সীমিত";
  if (c === "OFF") return "অফলাইন";
  return undefined;
}

function areaLabelFromRow(areas: AreaNameRow[]): string {
  if (areas.length === 0) return "এলাকা শীঘ্রই যুক্ত হবে";
  return areas.map((x) => x.area.nameBn ?? x.area.name).join(" · ");
}

function primaryAreaIdFromRow(areas: AreaNameRow[]): number | null {
  const id = areas[0]?.area?.id;
  return typeof id === "number" && id > 0 ? id : null;
}

function serviceAreaIdsFromRow(areas: AreaNameRow[]): number[] {
  return areas.map((x) => x.area.id).filter((id) => typeof id === "number" && id > 0);
}

const ANIMAL_FOCUS_RULES: {
  slug: PublicDoctorAnimalFocusSlug;
  test: (s: string) => boolean;
}[] = [
  {
    slug: "cow",
    test: (s) =>
      /গরু|গবাদি|কোরবানি|দুধেল|গাভী/i.test(s) || /\bcattle\b/i.test(s),
  },
  { slug: "goat", test: (s) => /ছাগল/i.test(s) || /\bgoat\b/i.test(s) },
  { slug: "buffalo", test: (s) => /মহিষ/i.test(s) || /\bbuffalo\b/i.test(s) },
  { slug: "sheep", test: (s) => /ভেড়া|ভেড়া/i.test(s) || /\bsheep\b/i.test(s) },
];

/** Heuristic tags from public profile strings — safe for filters only. */
export function inferAnimalFocusSlugs(
  ...sources: (string | null | undefined)[]
): PublicDoctorAnimalFocusSlug[] {
  const combined = sources
    .filter((x): x is string => Boolean(x?.trim()))
    .join(" ");
  if (!combined.trim()) return [];
  const out = new Set<PublicDoctorAnimalFocusSlug>();
  for (const rule of ANIMAL_FOCUS_RULES) {
    if (rule.test(combined)) out.add(rule.slug);
  }
  return [...out];
}

/** Pulls “N+ বছর” / digits+year patterns from admin-entered blurbs. */
export function extractYearsExperienceBn(
  ...sources: (string | null | undefined)[]
): string | null {
  for (const raw of sources) {
    const t = raw?.trim();
    if (!t) continue;
    const mPlus = t.match(/(\d{1,2})\s*\+\s*বছর/);
    if (mPlus) {
      return `${Number(mPlus[1]).toLocaleString("bn-BD")}+ বছর`;
    }
    const mYr = t.match(/(\d{1,2})\s*(?:\+)?\s*(?:বছর|yr|years)/i);
    if (mYr) {
      return `${Number(mYr[1]).toLocaleString("bn-BD")}+ বছর`;
    }
    const range = t.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*বছর/i);
    if (range) {
      return `${Number(range[1]).toLocaleString("bn-BD")}–${Number(range[2]).toLocaleString("bn-BD")} বছর`;
    }
  }
  return null;
}

const DEFAULT_BLURB =
  "কোরবানি ও গবাদিপশুর ক্ষেত্রে সরাসরি চিকিৎসা, পরামর্শ ও ফলো-আপে অভিজ্ঞতা।";

function experienceBlurbFromRow(d: DoctorPublicRow): string {
  return (
    d.experienceSummary?.trim() ||
    d.shortBio?.trim()?.slice(0, 200) ||
    DEFAULT_BLURB
  );
}

/** Format a whole-taka amount for display (Bengali digits). */
export function formatBdtIntegerBn(n: number): string {
  return `৳${n.toLocaleString("bn-BD")}`;
}

/**
 * Primary fee line for cards (min/max optional).
 * - Both: হোম কল ভিজিট: ৳…–৳…
 * - Min only: হোম কল ভিজিট: ৳… থেকে
 * - Neither: ভিজিট ফি: যোগাযোগের পর জানানো হবে
 */
export function formatHomeVisitFeeLineBn(
  min: number | null | undefined,
  max: number | null | undefined,
): string {
  const hasMin = typeof min === "number" && min > 0;
  const hasMax = typeof max === "number" && max > 0;
  if (hasMin && hasMax) {
    return `হোম কল ভিজিট: ${formatBdtIntegerBn(min!)}–${formatBdtIntegerBn(max!)}`;
  }
  if (hasMin) {
    return `হোম কল ভিজিট: ${formatBdtIntegerBn(min!)} থেকে`;
  }
  return "ভিজিট ফি: যোগাযোগের পর জানানো হবে";
}

export function toPublicDoctorCard(
  d: DoctorPublicRow,
  completedCount: number,
  options?: { mode?: "preview" | "directory" },
): PublicDoctorCard {
  const mode = options?.mode ?? "directory";
  const feeLineBn = formatHomeVisitFeeLineBn(d.homeVisitFeeMin, d.homeVisitFeeMax);
  const done = completedCount;
  const availabilityLabel =
    mode === "directory" ? availabilityBn(d.availabilityStatus) : undefined;
  const ratingLabel =
    mode === "directory"
      ? done > 0
        ? `অভিজ্ঞ · ${done.toLocaleString("bn-BD")}+ সম্পন্ন কেস`
        : "নতুন যুক্ত"
      : undefined;

  const schedule =
    mode === "directory" && d.availableTimeText?.trim()
      ? d.availableTimeText.trim()
      : null;

  const yearsExperienceBn =
    extractYearsExperienceBn(
      d.experienceSummary,
      d.qualification,
      d.shortBio?.slice(0, 400),
    ) ?? null;
  const animalFocusSlugs = inferAnimalFocusSlugs(
    d.experienceSummary,
    d.qualification,
    d.shortBio,
  );

  return {
    id: d.id,
    name: d.name,
    areaLabel: areaLabelFromRow(d.doctorAreas),
    experienceBlurb: experienceBlurbFromRow(d),
    completedCount: done,
    profilePhotoUrl: d.profilePhotoUrl,
    qualification: d.qualification,
    shortBio: d.shortBio,
    availabilityLabel,
    ratingLabel,
    availabilityStatusCode: d.availabilityStatus?.trim() || null,
    homeVisitFeeMin: d.homeVisitFeeMin,
    homeVisitFeeMax: d.homeVisitFeeMax,
    feeNote: d.feeNote?.trim() ? d.feeNote.trim() : null,
    feeLineBn,
    primaryAreaId: primaryAreaIdFromRow(d.doctorAreas),
    serviceAreaIds: serviceAreaIdsFromRow(d.doctorAreas),
    yearsExperienceBn,
    animalFocusSlugs: animalFocusSlugs.length ? animalFocusSlugs : undefined,
    ...(schedule ? { availableTimeText: schedule } : {}),
  };
}
