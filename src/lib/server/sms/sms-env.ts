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

/** Primary SMS API POST URL (BulkSMSBD-compatible form POST). */
export function getSmsPostUrl(): string {
  const custom = process.env.SMS_API_URL?.trim();
  if (custom) return custom.replace(/\/$/, "");
  return `${getBulkSmsBaseUrl()}/smsapi`;
}

export function getSmsApiKey(): string {
  return (process.env.SMS_API_KEY ?? process.env.BULKSMSBD_API_KEY ?? "").trim();
}

export function getSmsSenderId(): string {
  return (
    process.env.SMS_SENDER_ID ?? process.env.BULKSMSBD_SENDER_ID ?? ""
  ).trim();
}

/** Office lines for new public lead alerts — comma / semicolon / newline separated. */
export function getOfficeLeadNotifyPhones(): string[] {
  const raw =
    process.env.OFFICIAL_LEAD_RECEIVE_PHONES?.trim() ||
    process.env.OFFICIAL_LEAD_RECEIVE_PHONE?.trim() ||
    process.env.ADMIN_SMS_ALERT_PHONE?.trim() ||
    "";
  const set = new Set<string>();
  if (raw) {
    for (const part of raw.split(/[,;\n]+/)) {
      const t = part.replace(/\s/g, "").trim();
      if (t.length >= 10) set.add(t);
    }
  }
  const single = process.env.OFFICIAL_LEAD_RECEIVE_PHONE?.trim();
  if (single) {
    const t = single.replace(/\s/g, "");
    if (t.length >= 10) set.add(t);
  }
  return [...set];
}

/** @deprecated Prefer {@link getOfficeLeadNotifyPhones} — first configured office destination. */
export function getOfficeLeadNotifyPhone(): string {
  const all = getOfficeLeadNotifyPhones();
  return all[0] ?? "";
}

/** Shown in customer confirmation SMS (e.g. 01711XXXXXX). */
export function getCustomerSupportPhoneDisplay(): string {
  return (process.env.CUSTOMER_SUPPORT_PHONE ?? "").trim();
}
