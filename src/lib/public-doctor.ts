/**
 * Whitelist mapping for doctor data shown on public routes.
 * Never spread full `User` rows into public UI — use {@link toPublicDoctorCard}.
 */

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
  homeVisitFeeMin: number | null;
  homeVisitFeeMax: number | null;
  feeNote: string | null;
  /** Preformatted for cards (Bengali numerals where supported). */
  feeLineBn: string;
  /** Public schedule blurb when set by admin (directory / detail). */
  availableTimeText?: string;
};

type AreaNameRow = { area: { name: string; nameBn: string | null } };

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
    homeVisitFeeMin: d.homeVisitFeeMin,
    homeVisitFeeMax: d.homeVisitFeeMax,
    feeNote: d.feeNote?.trim() ? d.feeNote.trim() : null,
    feeLineBn,
    ...(schedule ? { availableTimeText: schedule } : {}),
  };
}
