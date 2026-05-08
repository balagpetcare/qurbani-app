/**
 * Server-only SMS configuration. Never import from client components.
 */
export function getPublicAppUrl(): string {
  const u =
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "";
  return u.replace(/\/$/, "");
}

export function getSmsBrandName(): string {
  return (process.env.SMS_BRAND_NAME ?? "Quarbani 2026").trim() || "Quarbani 2026";
}

/** Primary gate for real SMS sends (OTP + transactional). */
export function isOutboundSmsEnabled(): boolean {
  return process.env.SMS_ENABLED === "true";
}

/**
 * Legacy OTP-only toggle (Twilio era). When SMS_ENABLED is unset, `SMS_OTP_ENABLED=1`
 * still allows OTP SMS if BulkSMSBD credentials exist.
 */
export function isLegacyOtpSmsFlagOn(): boolean {
  return process.env.SMS_OTP_ENABLED === "1";
}

export function isSmsDryRun(): boolean {
  return process.env.SMS_DRY_RUN === "true";
}

export function getBulkSmsBaseUrl(): string {
  return (
    process.env.BULKSMSBD_BASE_URL?.trim() || "http://bulksmsbd.net/api"
  ).replace(/\/$/, "");
}
