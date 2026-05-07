import type { AnimalKind } from "@/generated/prisma/enums";
import { AnimalKind as AnimalKindEnum, ServiceAreaZone } from "@/generated/prisma/enums";

const BD_PHONE_LIKE = /(?:\+?88)?0?1[3-9]\d{8}\b/g;
const EMAIL_LIKE = /\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g;

export const CASE_HISTORY_TITLE_MAX = 200;
export const CASE_HISTORY_SUMMARY_MAX = 2000;
export const CASE_HISTORY_BODY_MAX = 12000;
export const CASE_HISTORY_FIELD_MAX = 8000;
export const CASE_HISTORY_AREA_BUCKET_MAX = 120;
export const CASE_HISTORY_MEDIA_URL_MAX = 8;

/** Coarse public labels only (never street address). */
export function areaBucketFromServiceZone(zone: ServiceAreaZone | null | undefined): string {
  switch (zone) {
    case ServiceAreaZone.NORTH_DHAKA:
      return "ঢাকা — উত্তর অঞ্চল";
    case ServiceAreaZone.CENTRAL_DHAKA:
      return "ঢাকা — কেন্দ্রীয় অঞ্চল";
    case ServiceAreaZone.OLD_DHAKA:
      return "ঢাকা — পুরনো ঢাকা";
    case ServiceAreaZone.SOUTH_DHAKA:
      return "ঢাকা — দক্ষিণ অঞ্চল";
    case ServiceAreaZone.WEST_DHAKA:
      return "ঢাকা — পশ্চিম অঞ্চল";
    case ServiceAreaZone.OUTSIDE_DHAKA:
      return "ঢাকা মহানগরের বাইরে";
    default:
      return "ঢাকা ও আশেপাশের সেবা অঞ্চল";
  }
}

export function isAllowedPublicAreaBucket(value: string): boolean {
  const buckets = new Set(
    (Object.values(ServiceAreaZone) as ServiceAreaZone[]).map((z) => areaBucketFromServiceZone(z)),
  );
  buckets.add(areaBucketFromServiceZone(undefined));
  return buckets.has(value.trim());
}

export function containsLikelyPII(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  BD_PHONE_LIKE.lastIndex = 0;
  if (BD_PHONE_LIKE.test(t)) return true;
  EMAIL_LIKE.lastIndex = 0;
  if (EMAIL_LIKE.test(t)) return true;
  const lower = t.toLowerCase();
  if (lower.includes("whatsapp") && /\d/.test(t)) return true;
  if (lower.includes("গ্রাহকের নাম") || lower.includes("customer name")) return true;
  return false;
}

export function parseAnimalKind(raw: unknown): AnimalKind | null | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "string") return null;
  return (Object.values(AnimalKindEnum) as string[]).includes(raw)
    ? (raw as AnimalKind)
    : null;
}

export function clampText(raw: unknown, max: number): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  return t.length > max ? t.slice(0, max) : t;
}

export function requireNonEmptyText(raw: unknown, max: number, labelBn: string) {
  const t = clampText(raw, max);
  if (!t || t.length < 2) {
    return { ok: false as const, message: `${labelBn} কমপক্ষে ২ অক্ষর লিখুন।` };
  }
  if (containsLikelyPII(t)) {
    return {
      ok: false as const,
      message: `${labelBn} এ গ্রাহকের ফোন, ইমেইল বা সনাক্তকরণযোগ্য তথ্য রাখা যাবে না।`,
    };
  }
  return { ok: true as const, value: t };
}

export function validateOptionalLongText(
  raw: unknown,
  max: number,
  labelBn: string,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  const t = clampText(raw, max);
  if (!t) return { ok: true, value: null };
  if (containsLikelyPII(t)) {
    return {
      ok: false,
      message: `${labelBn} এ গ্রাহকের ফোন, ইমেইল বা সনাক্তকরণযোগ্য তথ্য রাখা যাবে না।`,
    };
  }
  return { ok: true, value: t };
}

export function parseHttpsUrlList(raw: unknown): { ok: true; value: string[] } | { ok: false; message: string } {
  if (raw === undefined || raw === null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) return { ok: false, message: "mediaUrls অবশ্যই স্ট্রিং অ্যারে হতে হবে।" };
  if (raw.length > CASE_HISTORY_MEDIA_URL_MAX) {
    return { ok: false, message: `সর্বোচ্চ ${CASE_HISTORY_MEDIA_URL_MAX}টি মিডিয়া লিংক।` };
  }
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") return { ok: false, message: "প্রতিটি মিডিয়া লিংক স্ট্রিং হতে হবে।" };
    const u = item.trim();
    if (!u) continue;
    if (!u.startsWith("https://")) {
      return { ok: false, message: "মিডিয়া লিংক শুধু https:// দিয়ে শুরু করতে হবে।" };
    }
    if (u.length > 2048) return { ok: false, message: "মিডিয়া লিংক অতিরিক্ত দীর্ঘ।" };
    out.push(u);
  }
  return { ok: true, value: out };
}

export function mediaUrlsToDbJson(urls: string[]): string | null {
  if (!urls.length) return null;
  return JSON.stringify(urls);
}

export function mediaUrlsFromDbJson(raw: string | null): string[] {
  if (!raw || !raw.trim()) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter((x): x is string => typeof x === "string" && x.startsWith("https://"));
  } catch {
    return [];
  }
}
