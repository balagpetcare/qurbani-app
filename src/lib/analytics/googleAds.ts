/**
 * Google Ads (gtag.js) — Quarbani 2026
 *
 * ## Where conversions should fire
 * - **Lead / public “doctor request” booking (`/api/leads`):** After the API returns success,
 *   call `trackLeadSubmit()` once (see `SimpleRequestForm`). This is the primary “booking submit”
 *   funnel for customers.
 * - **WhatsApp CTAs:** On the user click that navigates to `wa.me` / WhatsApp — `trackWhatsAppClick()`
 *   (wired via `TrackedOutboundAnchor` and `BottomNav` for `wa.me` links).
 * - **Phone (`tel:`) CTAs:** On click before the dialer opens — `trackPhoneCallClick()`.
 * - **Vet “join us” application (`/api/doctor-applications`):** Optional separate Ads action —
 *   after successful POST, call `trackGoogleAdsConversion(buildGoogleAdsSendTo(label))` if you set
 *   `NEXT_PUBLIC_GOOGLE_ADS_CONV_LABEL_DOCTOR_APPLY` (see `DoctorApplicationForm`).
 *
 * ## How to add future events
 * 1. In Google Ads, create a conversion action and copy the **conversion label** (suffix after `AW-…/`).
 * 2. Either add a new `NEXT_PUBLIC_GOOGLE_ADS_CONV_LABEL_*` and a thin wrapper here, or call
 *    `trackGoogleAdsConversion(buildGoogleAdsSendTo("your_label"), { transaction_id: "…" })` at the
 *    exact success or click site.
 * 3. Prefer firing **after** server confirmation for form conversions; use click handlers only for
 *    outbound links where there is no server round-trip.
 *
 * Env vars (all optional — helpers no-op until you configure labels in production):
 * - `NEXT_PUBLIC_GOOGLE_ADS_CONV_LABEL_LEAD_SUBMIT` — maps to `trackLeadSubmit`
 * - `NEXT_PUBLIC_GOOGLE_ADS_CONV_LABEL_WHATSAPP` — maps to `trackWhatsAppClick`
 * - `NEXT_PUBLIC_GOOGLE_ADS_CONV_LABEL_PHONE_CALL` — maps to `trackPhoneCallClick`
 * - `NEXT_PUBLIC_GOOGLE_ADS_CONV_LABEL_DOCTOR_APPLY` — optional; doctor intake (`DoctorApplicationForm`) fires
 *   `trackGoogleAdsConversion(buildGoogleAdsSendTo(label), …)` when set.
 *
 * @see https://support.google.com/google-ads/answer/6331314
 */

export const GOOGLE_ADS_MEASUREMENT_ID = "AW-10985465175" as const;

type GtagCommand = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagCommand;
  }
}

export type GoogleAdsConversionParams = {
  value?: number;
  currency?: string;
  transaction_id?: string;
};

function readPublicEnvLabel(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = process.env[name]?.trim();
  return v || undefined;
}

const LEAD_SUBMIT_LABEL = readPublicEnvLabel(
  "NEXT_PUBLIC_GOOGLE_ADS_CONV_LABEL_LEAD_SUBMIT",
);
const WHATSAPP_LABEL = readPublicEnvLabel(
  "NEXT_PUBLIC_GOOGLE_ADS_CONV_LABEL_WHATSAPP",
);
const PHONE_CALL_LABEL = readPublicEnvLabel(
  "NEXT_PUBLIC_GOOGLE_ADS_CONV_LABEL_PHONE_CALL",
);

function getGtag(): GtagCommand | undefined {
  if (typeof window === "undefined") return undefined;
  return typeof window.gtag === "function" ? window.gtag : undefined;
}

/** Builds `send_to` for Google Ads conversion events (`AW-XXXXX/conversion_label`). */
export function buildGoogleAdsSendTo(conversionLabel: string): string {
  const label = conversionLabel.trim();
  if (!label) return "";
  return `${GOOGLE_ADS_MEASUREMENT_ID}/${label}`;
}

/**
 * Low-level conversion hit. Requires the global tag (see `GoogleAdsRootScripts` in root layout).
 * Safe on server: returns immediately when `window` is unavailable.
 */
export function trackGoogleAdsConversion(
  sendTo: string,
  params?: GoogleAdsConversionParams,
): void {
  if (typeof window === "undefined") return;
  const trimmed = sendTo.trim();
  if (!trimmed) return;
  const gtag = getGtag();
  if (!gtag) return;
  gtag("event", "conversion", {
    send_to: trimmed,
    ...params,
  });
}

/** Successful public lead / vet request form submit (`POST /api/leads`). */
export function trackLeadSubmit(params?: GoogleAdsConversionParams): void {
  if (!LEAD_SUBMIT_LABEL) return;
  trackGoogleAdsConversion(buildGoogleAdsSendTo(LEAD_SUBMIT_LABEL), params);
}

/** User tapped a WhatsApp chat outbound link. */
export function trackWhatsAppClick(): void {
  if (!WHATSAPP_LABEL) return;
  trackGoogleAdsConversion(buildGoogleAdsSendTo(WHATSAPP_LABEL));
}

/** User tapped a voice hotline `tel:` link. */
export function trackPhoneCallClick(): void {
  if (!PHONE_CALL_LABEL) return;
  trackGoogleAdsConversion(buildGoogleAdsSendTo(PHONE_CALL_LABEL));
}
