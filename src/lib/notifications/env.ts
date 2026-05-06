/**
 * Future outbound notification configuration (no secrets in repo).
 *
 * | Variable | Purpose |
 * |----------|---------|
 * | `QURBANI_NOTIFICATION_WHATSAPP_DRIVER` | `none` \| `twilio` \| `meta` \| `messagebird` (planned) |
 * | `QURBANI_NOTIFICATION_SMS_DRIVER` | `none` \| `twilio` \| ... |
 * | `QURBANI_NOTIFICATION_EMAIL_DRIVER` | `none` \| `resend` \| `ses` \| `smtp` (planned) |
 * | `TWILIO_ACCOUNT_SID` | Provider credential (set in host secrets only) |
 * | `TWILIO_AUTH_TOKEN` | Provider credential |
 * | `META_WHATSAPP_TOKEN` | WhatsApp Cloud API |
 * | `META_WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Cloud API |
 *
 * IN_APP rows are always written to `Notification` with `channel: IN_APP` (queue UI).
 * Emergency content must keep `[জরুরি / EMERGENCY]` / `EMERGENCY_LEAD` type at source (see `POST /api/leads`).
 */

export function getNotificationDriver(
  channel: "WHATSAPP" | "SMS" | "EMAIL",
): string {
  if (channel === "WHATSAPP") {
    return process.env.QURBANI_NOTIFICATION_WHATSAPP_DRIVER ?? "none";
  }
  if (channel === "SMS") {
    return process.env.QURBANI_NOTIFICATION_SMS_DRIVER ?? "none";
  }
  return process.env.QURBANI_NOTIFICATION_EMAIL_DRIVER ?? "none";
}
