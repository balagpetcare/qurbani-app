/**
 * Official public contact constants — landing, CTAs, SiteSetting seed defaults.
 * Do not use for user-entered phones or doctor profile fields.
 */
import { formatPhoneForDisplay } from "@/lib/phone";

/** Customer-visible primary call line */
export const OFFICIAL_CALL_NUMBER_DISPLAY = "01881-227204";

/** `tel:` URI for official call line (no spaces/hyphens inside URI per project rules) */
export const OFFICIAL_CALL_NUMBER_TEL = "tel:01881227204";

/** Customer-visible WhatsApp line */
export const OFFICIAL_WHATSAPP_DISPLAY = "+880 1701-022274";

/** Canonical WhatsApp chat link — digits only in path */
export const OFFICIAL_WHATSAPP_WA_ME = "https://wa.me/8801701022274";

/** Stored in SiteSetting / payload fallbacks — international digits without `+` */
export const OFFICIAL_CALL_NUMBER_DIGITS = "8801881227204";

export const OFFICIAL_WHATSAPP_NUMBER_DIGITS = "8801701022274";

/** @deprecated Use OFFICIAL_CALL_NUMBER_DIGITS — kept for legacy imports */
export const LANDING_SUPPORT_DIGITS = OFFICIAL_CALL_NUMBER_DIGITS;

function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/** Visible label when showing official line OR formatted fallback from stored digits */
export function landingCallNumberDisplay(storedDigitsOrRaw: string): string {
  const compact = digitsOnly(storedDigitsOrRaw);
  if (compact === OFFICIAL_CALL_NUMBER_DIGITS) return OFFICIAL_CALL_NUMBER_DISPLAY;
  return formatPhoneForDisplay(storedDigitsOrRaw);
}

/** Visible WhatsApp label for footer / inline copy */
export function landingWhatsAppNumberDisplay(storedDigitsOrRaw: string): string {
  const compact = digitsOnly(storedDigitsOrRaw);
  if (compact === OFFICIAL_WHATSAPP_NUMBER_DIGITS) return OFFICIAL_WHATSAPP_DISPLAY;
  return formatPhoneForDisplay(storedDigitsOrRaw);
}
