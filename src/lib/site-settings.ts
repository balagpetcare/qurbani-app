import type { Prisma } from "@/generated/prisma/client";

import {
  OFFICIAL_CALL_NUMBER_DIGITS,
  OFFICIAL_WHATSAPP_NUMBER_DIGITS,
} from "@/lib/public-contact";
import {
  ALL_SITE_SETTING_KEYS,
  SITE_SETTING_KEYS,
  SITE_SETTING_SEED_ROWS,
  type SiteSettingKey,
} from "@/lib/site-setting-registry";
import { normalizeBangladeshPhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export type JsonPrimitive = string | number | boolean | null;

function jsonToString(v: Prisma.JsonValue | undefined, fallback: string): string {
  if (v === undefined || v === null) return fallback;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

function jsonToBool(v: Prisma.JsonValue | undefined, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  return fallback;
}

function jsonToFiniteNumber(
  v: Prisma.JsonValue | undefined,
  fallback: number,
): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

const defaultByKey = new Map<string, Prisma.JsonValue>(
  SITE_SETTING_SEED_ROWS.map((r) => [r.key, r.value as Prisma.JsonValue]),
);

export async function loadSiteSettingsMap(): Promise<Map<string, Prisma.JsonValue>> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: ALL_SITE_SETTING_KEYS } },
    select: { key: true, value: true },
  });
  const map = new Map<string, Prisma.JsonValue>();
  for (const k of ALL_SITE_SETTING_KEYS) {
    map.set(k, defaultByKey.get(k) ?? null);
  }
  for (const r of rows) {
    map.set(r.key, r.value as Prisma.JsonValue);
  }
  return map;
}

function pick(
  map: Map<string, Prisma.JsonValue>,
  key: SiteSettingKey,
): Prisma.JsonValue | undefined {
  return map.get(key);
}

/** Digits string for landing links — prefers valid BD `8801…`, else stripped digits, else fallback. */
function landingContactDigits(raw: string, fallbackDigits: string): string {
  const fb = fallbackDigits.replace(/\D/g, "");
  const s = raw.trim();
  if (!s) return fb;
  const loc = normalizeBangladeshPhone(s);
  if (loc) return `880${loc.slice(1)}`;
  const d = s.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("880")) return d;
  if (d.length >= 10 && d.length <= 15) return d;
  return fb;
}

export type LandingPublicPayload = {
  publicSiteEnabled: boolean;
  maintenanceMode: boolean;
  publicSiteTitle: string;
  heroTitle: string;
  heroSubtitle: string;
  phoneCallDigits: string;
  whatsappDigits: string;
  emergencyDigits: string;
  email: string;
  address: string;
  facebookUrl: string;
  messengerUrl: string;
  googleMapsUrl: string;
  leadFormEnabled: boolean;
  emergencyLeadEnabled: boolean;
  thankYouMessage: string;
  applicationsEnabled: boolean;
  seoPageTitle: string;
  seoMetaDescription: string;
  facebookPixelId: string;
  googleAnalyticsId: string;
};

export function buildLandingPayloadFromMap(
  map: Map<string, Prisma.JsonValue>,
): LandingPublicPayload {
  const phoneFallback = OFFICIAL_CALL_NUMBER_DIGITS;
  const whatsappFallback = OFFICIAL_WHATSAPP_NUMBER_DIGITS;
  return {
    publicSiteEnabled: jsonToBool(
      pick(map, SITE_SETTING_KEYS.SYSTEM_PUBLIC_SITE_ENABLED),
      true,
    ),
    maintenanceMode: jsonToBool(
      pick(map, SITE_SETTING_KEYS.SYSTEM_MAINTENANCE_MODE),
      false,
    ),
    publicSiteTitle: jsonToString(
      pick(map, SITE_SETTING_KEYS.WEBSITE_PUBLIC_TITLE),
      "কুরবানি ২০২৬ · ভেটেরিনারি সহায়তা",
    ),
    heroTitle: jsonToString(
      pick(map, SITE_SETTING_KEYS.WEBSITE_HERO_TITLE),
      "কোরবানির পশুর জন্য দ্রুত ও নির্ভরযোগ্য ডাক্তার সহায়তা",
    ),
    heroSubtitle: jsonToString(
      pick(map, SITE_SETTING_KEYS.WEBSITE_HERO_SUBTITLE),
      "আপনার পশুর যেকোনো জরুরি প্রয়োজনে আমরা দ্রুত সাড়া দিই। কল, WhatsApp অথবা নিচের ফর্ম পূরণ করে আমাদের জানান।",
    ),
    phoneCallDigits: landingContactDigits(
      jsonToString(pick(map, SITE_SETTING_KEYS.CONTACT_PHONE_CALL), ""),
      phoneFallback,
    ),
    whatsappDigits: landingContactDigits(
      jsonToString(pick(map, SITE_SETTING_KEYS.CONTACT_WHATSAPP), ""),
      whatsappFallback,
    ),
    emergencyDigits: landingContactDigits(
      jsonToString(pick(map, SITE_SETTING_KEYS.CONTACT_EMERGENCY), ""),
      phoneFallback,
    ),
    email: jsonToString(pick(map, SITE_SETTING_KEYS.CONTACT_EMAIL), ""),
    address: jsonToString(pick(map, SITE_SETTING_KEYS.CONTACT_ADDRESS), ""),
    facebookUrl: jsonToString(pick(map, SITE_SETTING_KEYS.CONTACT_FACEBOOK_URL), ""),
    messengerUrl: jsonToString(pick(map, SITE_SETTING_KEYS.CONTACT_MESSENGER_URL), ""),
    googleMapsUrl: jsonToString(
      pick(map, SITE_SETTING_KEYS.CONTACT_GOOGLE_MAPS_URL),
      "",
    ),
    leadFormEnabled: jsonToBool(pick(map, SITE_SETTING_KEYS.LEADS_FORM_ENABLED), true),
    emergencyLeadEnabled: jsonToBool(
      pick(map, SITE_SETTING_KEYS.LEADS_EMERGENCY_ENABLED),
      true,
    ),
    thankYouMessage: jsonToString(
      pick(map, SITE_SETTING_KEYS.LEADS_SUCCESS_MESSAGE),
      "",
    ),
    applicationsEnabled: jsonToBool(
      pick(map, SITE_SETTING_KEYS.APPLICATIONS_ENABLED),
      true,
    ),
    seoPageTitle: jsonToString(
      pick(map, SITE_SETTING_KEYS.SEO_PAGE_TITLE),
      "Quarbani 2026 — কুরবানি ভেটেরিনারি সহায়তা",
    ),
    seoMetaDescription: jsonToString(
      pick(map, SITE_SETTING_KEYS.SEO_META_DESCRIPTION),
      "",
    ),
    facebookPixelId: jsonToString(
      pick(map, SITE_SETTING_KEYS.SEO_FACEBOOK_PIXEL_ID),
      "",
    ).trim(),
    googleAnalyticsId: jsonToString(
      pick(map, SITE_SETTING_KEYS.SEO_GOOGLE_ANALYTICS_ID),
      "",
    ).trim(),
  };
}

export async function getLandingPublicPayload(): Promise<LandingPublicPayload> {
  const map = await loadSiteSettingsMap();
  return buildLandingPayloadFromMap(map);
}

export async function getLandingPublicPayloadSafe(): Promise<LandingPublicPayload> {
  try {
    return await getLandingPublicPayload();
  } catch (err) {
    console.error("getLandingPublicPayloadSafe", err);
    return buildLandingPayloadFromMap(defaultByKey);
  }
}

export async function getLeadFormEnabled(): Promise<boolean> {
  const map = await loadSiteSettingsMap();
  return jsonToBool(pick(map, SITE_SETTING_KEYS.LEADS_FORM_ENABLED), true);
}

export async function getEmergencyLeadEnabled(): Promise<boolean> {
  const map = await loadSiteSettingsMap();
  return jsonToBool(pick(map, SITE_SETTING_KEYS.LEADS_EMERGENCY_ENABLED), true);
}

export async function getDoctorApplicationsEnabled(): Promise<boolean> {
  const map = await loadSiteSettingsMap();
  return jsonToBool(pick(map, SITE_SETTING_KEYS.APPLICATIONS_ENABLED), true);
}

export async function getAdminInAppNotificationsEnabled(): Promise<boolean> {
  const map = await loadSiteSettingsMap();
  return jsonToBool(pick(map, SITE_SETTING_KEYS.NOTIFICATIONS_ADMIN_IN_APP), true);
}

export async function getDoctorInAppNotificationsEnabled(): Promise<boolean> {
  const map = await loadSiteSettingsMap();
  return jsonToBool(pick(map, SITE_SETTING_KEYS.NOTIFICATIONS_DOCTOR_IN_APP), true);
}

/** Default 10% if unset; clamped 0–100. */
export async function getBillingPlatformCommissionRatePercent(): Promise<number> {
  const map = await loadSiteSettingsMap();
  const n = jsonToFiniteNumber(
    pick(map, SITE_SETTING_KEYS.BILLING_PLATFORM_COMMISSION_RATE_PERCENT),
    10,
  );
  return Math.min(100, Math.max(0, n));
}

export async function getAdminNotice(): Promise<string> {
  const map = await loadSiteSettingsMap();
  return jsonToString(pick(map, SITE_SETTING_KEYS.SYSTEM_ADMIN_NOTICE), "").trim();
}

export type SiteSettingRowView = {
  id: number;
  key: string;
  value: Prisma.JsonValue;
  group: string;
  label: string;
  description: string | null;
  isPublic: boolean;
};

export async function loadMergedSiteSettingsForAdmin(): Promise<SiteSettingRowView[]> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: ALL_SITE_SETTING_KEYS } },
    orderBy: [{ group: "asc" }, { key: "asc" }],
  });
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return SITE_SETTING_SEED_ROWS.map((def) => {
    const existing = byKey.get(def.key);
    if (existing) {
      return {
        id: existing.id,
        key: existing.key,
        value: existing.value as Prisma.JsonValue,
        group: existing.group,
        label: existing.label,
        description: existing.description,
        isPublic: existing.isPublic,
      };
    }
    return {
      id: 0,
      key: def.key,
      value: def.value as Prisma.JsonValue,
      group: def.group,
      label: def.label,
      description: def.description ?? null,
      isPublic: def.isPublic,
    };
  });
}

/** Normalize PATCH body values against registry column expectations. */
export function coerceSettingValue(
  key: string,
  raw: unknown,
): Prisma.InputJsonValue | null {
  const row = SITE_SETTING_SEED_ROWS.find((r) => r.key === key);
  if (!row) return null;
  const template = row.value;
  if (typeof template === "boolean") {
    if (typeof raw === "boolean") return raw;
    if (raw === "true" || raw === "1") return true;
    if (raw === "false" || raw === "0") return false;
    return null;
  }
  if (typeof template === "string") {
    if (typeof raw !== "string") return null;
    return raw;
  }
  if (typeof template === "number") {
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && raw.trim() !== "") {
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }
  return null;
}
