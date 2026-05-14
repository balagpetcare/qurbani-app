/**
 * Mask customer phone for WhatsApp group broadcast (never full digits).
 * Example: 01712345678 → 01712****78
 */
export function maskBangladeshStylePhoneForWhatsApp(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length === 13) {
    digits = `0${digits.slice(3)}`;
  }
  if (digits.length < 7) {
    return "****";
  }
  if (digits.length === 11) {
    return `${digits.slice(0, 5)}****${digits.slice(-2)}`;
  }
  const headLen = Math.min(5, Math.max(3, digits.length - 6));
  return `${digits.slice(0, headLen)}****${digits.slice(-2)}`;
}
