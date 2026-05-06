/**
 * Official public contact constants — landing, CTAs, SiteSetting seed defaults.
 * Do not use for user-entered phones or doctor profile fields.
 */
import { formatPhoneForDisplay } from "@/lib/phone";

/** Customer-visible call / contact line (single public number) */
export const OFFICIAL_CALL_NUMBER_DISPLAY = "01701022274";

/** Public `tel:` link — E.164 style */
export const OFFICIAL_CALL_NUMBER_TEL = "tel:+8801701022274";

/** Visible WhatsApp / same-line display */
export const OFFICIAL_WHATSAPP_DISPLAY = "01701022274";

/** Canonical WhatsApp chat link — digits only in path */
export const OFFICIAL_WHATSAPP_WA_ME = "https://wa.me/8801701022274";

/** Stored in SiteSetting / payload fallbacks — international digits without `+` */
export const OFFICIAL_PUBLIC_CONTACT_DIGITS = "8801701022274";

export const OFFICIAL_CALL_NUMBER_DIGITS = OFFICIAL_PUBLIC_CONTACT_DIGITS;

export const OFFICIAL_WHATSAPP_NUMBER_DIGITS = OFFICIAL_PUBLIC_CONTACT_DIGITS;

/** @deprecated Use OFFICIAL_PUBLIC_CONTACT_DIGITS */
export const LANDING_SUPPORT_DIGITS = OFFICIAL_PUBLIC_CONTACT_DIGITS;

function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/** Visible label when showing official line OR formatted fallback from stored digits */
export function landingCallNumberDisplay(storedDigitsOrRaw: string): string {
  const compact = digitsOnly(storedDigitsOrRaw);
  if (compact === OFFICIAL_PUBLIC_CONTACT_DIGITS) return OFFICIAL_CALL_NUMBER_DISPLAY;
  return formatPhoneForDisplay(storedDigitsOrRaw);
}

/** Visible WhatsApp label for footer / inline copy */
export function landingWhatsAppNumberDisplay(storedDigitsOrRaw: string): string {
  const compact = digitsOnly(storedDigitsOrRaw);
  if (compact === OFFICIAL_PUBLIC_CONTACT_DIGITS) return OFFICIAL_WHATSAPP_DISPLAY;
  return formatPhoneForDisplay(storedDigitsOrRaw);
}
