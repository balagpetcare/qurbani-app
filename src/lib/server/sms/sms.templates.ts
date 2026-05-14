import { formatPhoneForDisplay } from "@/lib/phone";
import { getSmsBrandName } from "@/lib/server/sms/sms-env";

function clampPlainText(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

export function buildOtpSmsBody(plainCode: string): string {
  const brand = getSmsBrandName();
  return `Your ${brand} OTP is ${plainCode}`;
}

export function buildLeadTrackingSms(trackingUrl: string): string {
  return `Quarbani 2026: আপনার চিকিৎসা রিকোয়েস্ট গ্রহণ করা হয়েছে। ট্র্যাক করুন: ${trackingUrl}`;
}

export function buildLeadIntakeCustomerConfirmationSms(input: {
  supportDisplayPhone: string;
  trackingUrl: string;
}): string {
  const brand = getSmsBrandName();
  const lines = [
    "আপনার অনুরোধটি গ্রহণ করা হয়েছে।",
    "একজন ডাক্তার খুব দ্রুত আপনার সাথে যোগাযোগ করবেন।",
    "",
  ];
  const support = input.supportDisplayPhone.trim();
  if (support) {
    lines.push("প্রয়োজনে কল করুন:");
    lines.push(support);
    lines.push("");
  }
  lines.push(`— ${brand} Veterinary Support`);
  const track = input.trackingUrl.trim();
  if (track.startsWith("http")) {
    lines.push("");
    lines.push(`অগ্রগতি দেখুন: ${track}`);
  }
  return clampPlainText(lines.join("\n"), 480);
}

export function buildLeadIntakeOfficeSms(input: {
  leadId: number;
  customerName: string;
  customerPhone: string;
  areaLabel: string;
  animalLabel: string;
  problemPreview: string;
  trackingUrl: string;
}): string {
  const phoneDisplay = formatPhoneForDisplay(input.customerPhone);
  const prob = clampPlainText(input.problemPreview, 220);
  const lines = [
    `নতুন ভেটেরিনারি অনুরোধ #${input.leadId}`,
    `নাম: ${clampPlainText(input.customerName, 80)}`,
    `মোবাইল: ${phoneDisplay}`,
    `এলাকা: ${clampPlainText(input.areaLabel, 80)}`,
    `পশু: ${clampPlainText(input.animalLabel, 80)}`,
    `সমস্যা: ${prob || "—"}`,
  ];
  const track = input.trackingUrl.trim();
  if (track.startsWith("http")) {
    lines.push(`ট্র্যাক: ${track}`);
  }
  return clampPlainText(lines.join("\n"), 470);
}

export function buildDoctorNewLeadSms(areaName: string, leadUrl: string): string {
  return `Quarbani 2026: নতুন চিকিৎসা রিকোয়েস্ট এসেছে। এলাকা: ${areaName}. দেখুন: ${leadUrl}`;
}

export function buildAdminNewLeadSms(areaName: string, leadUrl: string): string {
  return buildDoctorNewLeadSms(areaName, leadUrl);
}

export function buildCustomerLeadAcceptedSms(trackingUrl: string): string {
  return `Quarbani 2026: আপনার রিকোয়েস্ট একজন ডাক্তার গ্রহণ করেছেন। আপডেট দেখুন: ${trackingUrl}`;
}

export function customerStatusSmsBody(
  statusKey:
    | "ASSIGNED"
    | "ACCEPTED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "FOLLOW_UP_NEEDED"
    | "CANCELLED",
  trackingUrl: string,
): string | null {
  const brand = getSmsBrandName();
  switch (statusKey) {
    case "ASSIGNED":
      return `${brand}: আপনার রিকোয়েস্টে একজন ডাক্তার যুক্ত হয়েছেন। দেখুন: ${trackingUrl}`;
    case "ACCEPTED":
      return `${brand}: আপনার রিকোয়েস্ট গ্রহণ করা হয়েছে। দেখুন: ${trackingUrl}`;
    case "IN_PROGRESS":
      return `${brand}: ডাক্তার চিকিৎসা শুরু করেছেন / পথে আছেন। আপডেট: ${trackingUrl}`;
    case "COMPLETED":
      return `${brand}: আপনার চিকিৎসা রিকোয়েস্ট সম্পন্ন হয়েছে। দেখুন: ${trackingUrl}`;
    case "FOLLOW_UP_NEEDED":
      return `${brand}: ফলোআপ প্রয়োজন হতে পারে। দেখুন: ${trackingUrl}`;
    case "CANCELLED":
      return `${brand}: আপনার রিকোয়েস্ট বাতিল করা হয়েছে। বিস্তারিত: ${trackingUrl}`;
    default:
      return null;
  }
}
