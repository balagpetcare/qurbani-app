import {
  bangladeshTelHref,
  normalizeBdContactSettingDigits,
  phoneToWhatsAppNumber,
} from "@/lib/phone";
import {
  OFFICIAL_CALL_NUMBER_DIGITS,
  OFFICIAL_CALL_NUMBER_TEL,
  OFFICIAL_WHATSAPP_NUMBER_DIGITS,
  OFFICIAL_WHATSAPP_WA_ME,
} from "@/lib/public-contact";

function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Public landing `tel:` links — uses `tel:01881227204` for the official helpline when the
 * configured line matches {@link OFFICIAL_CALL_NUMBER_DIGITS}; otherwise {@link bangladeshTelHref}.
 */
export function landingTelHref(contactRaw: string): string {
  const cleaned = contactRaw.trim();
  if (!digitsOnly(cleaned)) {
    return OFFICIAL_CALL_NUMBER_TEL;
  }
  const normalized = normalizeBdContactSettingDigits(cleaned);
  if (normalized === OFFICIAL_CALL_NUMBER_DIGITS) {
    return OFFICIAL_CALL_NUMBER_TEL;
  }
  return bangladeshTelHref(cleaned);
}

/**
 * WhatsApp CTA — uses canonical {@link OFFICIAL_WHATSAPP_WA_ME} for the official line when
 * configured digits match; avoids Next/link prefetch on API routes (call sites use `<a>`).
 */
export function landingWhatsAppHref(contactRaw: string): string {
  const cleaned = contactRaw.trim();
  if (!digitsOnly(cleaned)) {
    return OFFICIAL_WHATSAPP_WA_ME;
  }
  const wa = phoneToWhatsAppNumber(cleaned);
  const fbWa = OFFICIAL_WHATSAPP_NUMBER_DIGITS;
  if (!wa) {
    return `https://wa.me/${fbWa}`;
  }
  if (wa === OFFICIAL_WHATSAPP_NUMBER_DIGITS) {
    return OFFICIAL_WHATSAPP_WA_ME;
  }
  return `https://wa.me/${wa}`;
}

/** Dedicated public lead page (landing no longer embeds the full form). */
export const LANDING_REQUEST_PATH = "/request";

/** @deprecated Prefer {@link LANDING_REQUEST_PATH}. Kept for imports that still use this name. */
export const LANDING_LEAD_FORM_HASH = LANDING_REQUEST_PATH;
