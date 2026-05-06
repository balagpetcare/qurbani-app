/**
 * Outbound WhatsApp / SMS / email — **placeholder only**.
 *
 * Provider wiring: see `src/lib/notifications/env.ts` and `dispatchOutboundNotificationPlaceholder`.
 *
 * TODO: Integrate a provider (Twilio, MessageBird, Meta WhatsApp Cloud API, Resend, SES…)
 * using env vars. Do **not** commit real credentials or API keys in this repo.
 */
export type DeliveryPayload = {
  to: string;
  body: string;
};

export async function sendWhatsAppPlaceholder(
  payload: DeliveryPayload,
): Promise<{ ok: false; reason: "NOT_IMPLEMENTED" }> {
  void payload;
  return { ok: false, reason: "NOT_IMPLEMENTED" };
}

export async function sendSmsPlaceholder(
  payload: DeliveryPayload,
): Promise<{ ok: false; reason: "NOT_IMPLEMENTED" }> {
  void payload;
  return { ok: false, reason: "NOT_IMPLEMENTED" };
}

export async function sendEmailPlaceholder(
  payload: { to: string; subject: string; text: string },
): Promise<{ ok: false; reason: "NOT_IMPLEMENTED" }> {
  void payload;
  return { ok: false, reason: "NOT_IMPLEMENTED" };
}
