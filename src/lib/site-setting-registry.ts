import type { Prisma } from "@/generated/prisma/client";

import {
  OFFICIAL_CALL_NUMBER_DIGITS,
  OFFICIAL_WHATSAPP_NUMBER_DIGITS,
} from "@/lib/public-contact";

/** Canonical keys + seed metadata (also used for admin PATCH allowlist). */
export type SiteSettingSeedRow = {
  key: string;
  value: Prisma.InputJsonValue;
  group: string;
  label: string;
  description?: string;
  isPublic: boolean;
};

export const SITE_SETTING_KEYS = {
  WEBSITE_PUBLIC_TITLE: "website.public_site_title",
  WEBSITE_HERO_TITLE: "website.hero_title",
  WEBSITE_HERO_SUBTITLE: "website.hero_subtitle",
  CONTACT_PHONE_CALL: "contact.phone_call",
  CONTACT_WHATSAPP: "contact.whatsapp",
  CONTACT_EMERGENCY: "contact.emergency_hotline",
  CONTACT_EMAIL: "contact.email",
  CONTACT_ADDRESS: "contact.address",
  CONTACT_FACEBOOK_URL: "contact.facebook_url",
  CONTACT_MESSENGER_URL: "contact.messenger_url",
  CONTACT_GOOGLE_MAPS_URL: "contact.google_maps_url",
  LEADS_FORM_ENABLED: "leads.form_enabled",
  LEADS_EMERGENCY_ENABLED: "leads.emergency_enabled",
  LEADS_SUCCESS_MESSAGE: "leads.success_message",
  APPLICATIONS_ENABLED: "applications.enabled",
  NOTIFICATIONS_ADMIN_IN_APP: "notifications.admin_in_app_enabled",
  NOTIFICATIONS_DOCTOR_IN_APP: "notifications.doctor_in_app_enabled",
  SYSTEM_MAINTENANCE_MODE: "system.maintenance_mode",
  SYSTEM_PUBLIC_SITE_ENABLED: "system.public_site_enabled",
  SYSTEM_ADMIN_NOTICE: "system.admin_notice",
  SEO_PAGE_TITLE: "seo.page_title",
  SEO_META_DESCRIPTION: "seo.meta_description",
  SEO_FACEBOOK_PIXEL_ID: "seo.facebook_pixel_id",
  SEO_GOOGLE_ANALYTICS_ID: "seo.google_analytics_id",
  BILLING_PLATFORM_COMMISSION_RATE_PERCENT: "billing.platform_commission_rate_percent",
} as const;

export type SiteSettingKey =
  (typeof SITE_SETTING_KEYS)[keyof typeof SITE_SETTING_KEYS];

export const ALL_SITE_SETTING_KEYS = Object.values(SITE_SETTING_KEYS) as string[];

/** Safe defaults if DB row missing (Bengali-friendly copy). */
export const SITE_SETTING_SEED_ROWS: SiteSettingSeedRow[] = [
  {
    key: SITE_SETTING_KEYS.WEBSITE_PUBLIC_TITLE,
    value: "কুরবানি ২০২৬ · ভেটেরিনারি সহায়তা",
    group: "website",
    label: "পাবলিক সাইট শিরোনাম",
    description: "হেডার/ব্র্যান্ড লাইন।",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.WEBSITE_HERO_TITLE,
    value: "কোরবানির পশুর জন্য দ্রুত ও নির্ভরযোগ্য ডাক্তার সহায়তা",
    group: "website",
    label: "হিরো শিরোনাম",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.WEBSITE_HERO_SUBTITLE,
    value:
      "আপনার পশুর যেকোনো জরুরি প্রয়োজনে আমরা দ্রুত সাড়া দিই। কল, WhatsApp অথবা নিচের ফর্ম পূরণ করে আমাদের জানান। বিশ্বস্ত ভেটেরিনারি টিম আপনার এলাকা ও পশুর অবস্থা বুঝে পরামর্শ দেবে।",
    group: "website",
    label: "হিরো বিবরণ",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.CONTACT_PHONE_CALL,
    value: OFFICIAL_CALL_NUMBER_DIGITS,
    group: "contact",
    label: "কল করার নম্বর (ডিজিট)",
    description: "যেমন 8801XXXXXXXXX — শুধু সংখ্যা।",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.CONTACT_WHATSAPP,
    value: OFFICIAL_WHATSAPP_NUMBER_DIGITS,
    group: "contact",
    label: "WhatsApp নম্বর (ডিজিট)",
    description: "যেমন 8801XXXXXXXXX — শুধু সংখ্যা।",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.CONTACT_EMERGENCY,
    value: OFFICIAL_CALL_NUMBER_DIGITS,
    group: "contact",
    label: "জরুরি হটলাইন (ডিজিট)",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.CONTACT_EMAIL,
    value: "support@example.com",
    group: "contact",
    label: "ইমেইল",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.CONTACT_ADDRESS,
    value: "ঢাকা, বাংলাদেশ",
    group: "contact",
    label: "ঠিকানা",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.CONTACT_FACEBOOK_URL,
    value: "",
    group: "contact",
    label: "Facebook লিংক",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.CONTACT_MESSENGER_URL,
    value: "",
    group: "contact",
    label: "Messenger লিংক",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.CONTACT_GOOGLE_MAPS_URL,
    value: "",
    group: "contact",
    label: "Google Map লিংক",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.LEADS_FORM_ENABLED,
    value: true,
    group: "leads",
    label: "লিড ফর্ম চালু",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.LEADS_EMERGENCY_ENABLED,
    value: true,
    group: "leads",
    label: "জরুরি/ইমার্জেন্সি রিকোয়েস্ট চালু",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.LEADS_SUCCESS_MESSAGE,
    value:
      "আমরা যত দ্রুত সম্ভব আপনার দেওয়া নম্বরে কল বা মেসেজ করে ফিরব। ব্যস্ততার উপর নির্ভর করে সাধারণত খুব শীঘ্রই যোগাযোগ করা হয়।",
    group: "leads",
    label: "ধন্যবাদ পেজের বার্তা",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.APPLICATIONS_ENABLED,
    value: true,
    group: "applications",
    label: "ডাক্তার আবেদন ফর্ম চালু",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.NOTIFICATIONS_ADMIN_IN_APP,
    value: true,
    group: "notifications",
    label: "অ্যাডমিন ইন-অ্যাপ নোটিফিকেশন",
    description: "নতুন লিড/আবেদন ইত্যাদি কিউতে যাবে কিনা।",
    isPublic: false,
  },
  {
    key: SITE_SETTING_KEYS.NOTIFICATIONS_DOCTOR_IN_APP,
    value: true,
    group: "notifications",
    label: "ডাক্তার ইন-অ্যাপ নোটিফিকেশন",
    description: "অ্যাসাইনমেন্ট/কেস গ্রহণ ইত্যাদি কিউতে যাবে কিনা।",
    isPublic: false,
  },
  {
    key: SITE_SETTING_KEYS.SYSTEM_MAINTENANCE_MODE,
    value: false,
    group: "system",
    label: "মেইনটেন্যান্স মোড",
    description: "চালু হলে পাবলিক হোমপেজে নোটিশ দেখাবে (অ্যাডমিন/ডাক্তার পোর্টাল আলাদা)।",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.SYSTEM_PUBLIC_SITE_ENABLED,
    value: true,
    group: "system",
    label: "পাবলিক সাইট চালু",
    description: "বন্ধ থাকলে হোমপেজে সংক্ষিপ্ত বার্তা।",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.SYSTEM_ADMIN_NOTICE,
    value: "",
    group: "system",
    label: "অ্যাডমিন নোটিশ (শুধু অ্যাডমিন প্যানেল)",
    isPublic: false,
  },
  {
    key: SITE_SETTING_KEYS.SEO_PAGE_TITLE,
    value: "Quarbani 2026 — কুরবানি ভেটেরিনারি সহায়তা",
    group: "seo",
    label: "SEO পেজ টাইটেল",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.SEO_META_DESCRIPTION,
    value:
      "কোরবানির পশুর জন্য দ্রুত ও নির্ভরযোগ্য ভেটেরিনারি সহায়তা — কল, WhatsApp ও ডাক্তার অনুরোধ।",
    group: "seo",
    label: "মেটা ডেসক্রিপশন",
    isPublic: true,
  },
  {
    key: SITE_SETTING_KEYS.SEO_FACEBOOK_PIXEL_ID,
    value: "",
    group: "seo",
    label: "Facebook Pixel ID",
    isPublic: false,
  },
  {
    key: SITE_SETTING_KEYS.SEO_GOOGLE_ANALYTICS_ID,
    value: "",
    group: "seo",
    label: "Google Analytics / GTM ID",
    isPublic: false,
  },
  {
    key: SITE_SETTING_KEYS.BILLING_PLATFORM_COMMISSION_RATE_PERCENT,
    value: 10,
    group: "billing",
    label: "প্ল্যাটফর্ম কমিশন হার (%)",
    description: "সমাপনী বিলিংয়ে ডাক্তার কমিশন হিসাবে ব্যবহৃত — ১০ মানে ১০%।",
    isPublic: false,
  },
];
