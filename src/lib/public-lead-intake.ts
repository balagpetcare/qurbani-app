import type { AnimalKind, LeadContactPreference, LeadPriority } from "@/generated/prisma/enums";
import {
  AnimalKind as AnimalKindEnum,
  LeadContactPreference as LeadContactPreferenceEnum,
  LeadPriority as LeadPriorityEnum,
} from "@/generated/prisma/enums";

import { LEAD_PROBLEM_CATEGORY_SLUGS } from "@/lib/lead-problem-categories";
import { asTrimmedString } from "@/lib/validators";

const MAX_LEN = {
  approxAgeText: 120,
  problemDuration: 200,
  eatingStatus: 200,
  problemDetails: 4000,
  googleMapUrl: 2000,
  serviceRequirement: 8000,
  message: 8000,
  address: 4000,
  animalTypeOther: 200,
} as const;

const ANIMAL_KINDS = new Set<string>(Object.values(AnimalKindEnum));
const PRIORITIES = new Set<string>(Object.values(LeadPriorityEnum));
const CONTACT_PREFS = new Set<string>(Object.values(LeadContactPreferenceEnum));

export type ParsedPublicLeadIntake = {
  priority: LeadPriority;
  animalKind: AnimalKind | undefined;
  approxAgeText: string | undefined;
  approxWeightKg: number | undefined;
  problemCategory: string | undefined;
  problemDuration: string | undefined;
  eatingStatus: string | undefined;
  feverSuspected: boolean | null;
  bellyBloated: boolean | null;
  canWalk: boolean | null;
  problemDetails: string | undefined;
  preferredContact: LeadContactPreference | undefined;
  googleMapUrl: string | undefined;
  mediaUrlsJson: string | null;
};

function clampLen(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

export function parseLeadPriorityField(v: unknown): LeadPriority {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  if (PRIORITIES.has(s)) return s as LeadPriority;
  return LeadPriorityEnum.NORMAL;
}

export function parseAnimalKindField(v: unknown): AnimalKind | undefined {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  if (!s || !ANIMAL_KINDS.has(s)) return undefined;
  return s as AnimalKind;
}

export function parsePreferredContactField(
  v: unknown,
): LeadContactPreference | undefined {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  if (!s || !CONTACT_PREFS.has(s)) return undefined;
  return s as LeadContactPreference;
}

/** yes / no / empty → boolean | null (unknown = null). */
export function parseTriBool(v: unknown): boolean | null {
  if (v === undefined || v === null) return null;
  const s = typeof v === "string" ? v.trim().toLowerCase() : String(v);
  if (s === "" || s === "unknown") return null;
  if (s === "yes" || s === "true" || s === "1") return true;
  if (s === "no" || s === "false" || s === "0") return false;
  return null;
}

export function parseApproxWeightKg(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string"
        ? parseInt(v.trim(), 10)
        : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 5000) return undefined;
  return Math.floor(n);
}

export function parseProblemCategorySlug(v: unknown): string | undefined {
  const s = asTrimmedString(v);
  if (!s) return undefined;
  if (!LEAD_PROBLEM_CATEGORY_SLUGS.has(s)) return undefined;
  return s;
}

export function parsePublicLeadIntake(
  body: Record<string, unknown>,
): { ok: ParsedPublicLeadIntake } | { error: string } {
  const priority = parseLeadPriorityField(body.priority);
  const animalKind = parseAnimalKindField(body.animalKind);

  const approxAgeTextRaw = asTrimmedString(body.approxAgeText);
  const approxAgeText = approxAgeTextRaw
    ? clampLen(approxAgeTextRaw, MAX_LEN.approxAgeText)
    : undefined;

  const approxWeightKg = parseApproxWeightKg(body.approxWeightKg);

  const problemCategory = parseProblemCategorySlug(body.problemCategory);

  const problemDurationRaw = asTrimmedString(body.problemDuration);
  const problemDuration = problemDurationRaw
    ? clampLen(problemDurationRaw, MAX_LEN.problemDuration)
    : undefined;

  const eatingStatusRaw = asTrimmedString(body.eatingStatus);
  const eatingStatus = eatingStatusRaw
    ? clampLen(eatingStatusRaw, MAX_LEN.eatingStatus)
    : undefined;

  const feverSuspected = parseTriBool(body.feverSuspected);
  const bellyBloated = parseTriBool(body.bellyBloated);
  const canWalk = parseTriBool(body.canWalk);

  const problemDetailsRaw = asTrimmedString(body.problemDetails);
  const problemDetails = problemDetailsRaw
    ? clampLen(problemDetailsRaw, MAX_LEN.problemDetails)
    : undefined;

  const preferredContact = parsePreferredContactField(body.preferredContact);

  const googleMapUrlRaw = asTrimmedString(body.googleMapUrl);
  const googleMapUrl = googleMapUrlRaw
    ? clampLen(googleMapUrlRaw, MAX_LEN.googleMapUrl)
    : undefined;

  const mediaUrlsJson: string | null = null;

  if (animalKind === AnimalKindEnum.OTHER) {
    const other = asTrimmedString(body.animalTypeOther);
    if (!other) {
      return {
        error:
          "animalKind OTHER হলে অন্যান্য পশুর বর্ণনা (animalTypeOther) আবশ্যক।",
      };
    }
    if (other.length > MAX_LEN.animalTypeOther) {
      return { error: "অন্যান্য পশুর বর্ণনা খুব দীর্ঘ।" };
    }
  }

  return {
    ok: {
      priority,
      animalKind,
      approxAgeText,
      approxWeightKg,
      problemCategory,
      problemDuration,
      eatingStatus,
      feverSuspected,
      bellyBloated,
      canWalk,
      problemDetails,
      preferredContact,
      googleMapUrl,
      mediaUrlsJson,
    },
  };
}
