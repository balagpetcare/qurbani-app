import { maskBangladeshStylePhoneForWhatsApp } from "@/lib/phone-mask/mask-phone-for-whatsapp";

export type WhatsAppLeadDispatchInput = {
  leadId: number;
  customerName: string;
  /** Display area label (BN/EN). */
  areaLabel: string;
  animalLabel: string;
  rawPhone: string;
  problemText: string;
  acceptanceUrl: string;
};

/**
 * WhatsApp-ready plain text for doctor group manual paste.
 * Customer phone is always masked; full number is never included.
 */
export function formatQuarbaniWhatsAppLeadMessage(
  input: WhatsAppLeadDispatchInput,
): string {
  const masked = maskBangladeshStylePhoneForWhatsApp(input.rawPhone);
  return [
    `🚨 New Quarbani Lead #${input.leadId}`,
    "",
    `🐄 Animal: ${input.animalLabel}`,
    `📍 Area: ${input.areaLabel}`,
    `👤 ${input.customerName}`,
    "",
    `📞 ${masked}`,
    "",
    `📝 Problem:`,
    input.problemText.trim() || "—",
    "",
    `🔗 Accept Lead:`,
    input.acceptanceUrl,
  ].join("\n");
}
