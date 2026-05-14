import { getPublicAppUrl, getSmsBrandName } from "@/lib/server/sms/sms-env";
import { maskPhoneForLog } from "@/lib/ops-log";

function clampPlainText(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

/** English line always appended for provider compatibility + clarity. */
export const CUSTOMER_LEAD_CONFIRMATION_EN =
  "Your request has been received. Our veterinary team will contact you soon.";

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
  lines.push("");
  lines.push(CUSTOMER_LEAD_CONFIRMATION_EN);
  return clampPlainText(lines.join("\n"), 480);
}

export function buildOfficeLeadAlertSms(input: {
  leadId: number;
  customerName?: string;
  customerPhone: string;
  areaLabel: string;
  animalLabel?: string;
  problemPreview?: string;
  trackingUrl?: string;
}): string {
  const base = getPublicAppUrl().replace(/\/$/, "");
  const adminPath = "/admin/leads";
  const adminUrl = base ? `${base}${adminPath}` : adminPath;
  const area = clampPlainText(input.areaLabel, 80);
  const masked = maskPhoneForLog(input.customerPhone);
  return clampPlainText(
    `New veterinary lead #${input.leadId}. Area: ${area}. Phone: ${masked}. Open admin panel: ${adminUrl}`,
    470,
  );
}

/** @deprecated Use {@link buildOfficeLeadAlertSms} — kept as alias for imports. */
export const buildLeadIntakeOfficeSms = buildOfficeLeadAlertSms;
