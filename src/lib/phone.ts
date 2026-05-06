/**
 * Bangladesh mobile normalization for Quurbani (storage + WhatsApp).
 *
 * Canonical DB format: local `01[3-9]XXXXXXXX` (11 digits).
 * WhatsApp / wa.me uses international digits without `+`: `8801XXXXXXXXX` (13 digits).
 *
 * User input may include spaces, `+`, leading `00`, `880`, or national forms. The country
 * code for Bangladesh is **+880** (users sometimes type “+88”; a valid mobile still
 * normalizes to `8801…` after digit extraction when the digit length is correct).
 */

const LOCAL_MOBILE_RE = /^01[3-9]\d{8}$/;

/** User-facing validation message (Bengali). */
export const BD_PHONE_INVALID_MSG_BN = "সঠিক বাংলাদেশি ফোন নম্বর দিন।";

export const BD_WHATSAPP_INVALID_MSG_BN =
  "সঠিক বাংলাদেশি WhatsApp নম্বর দিন।";

function digitsOnly(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Normalize Bangladesh mobile numbers for storage and deduplication.
 *
 * Accepts common inputs (spaces, `+`, `880`, `00880`, national `1XXXXXXXXX`, etc.).
 *
 * @returns Canonical local `01XXXXXXXXX` or `null` if invalid.
 */
export function normalizeBangladeshPhone(input: string): string | null {
  if (typeof input !== "string") return null;
  let d = digitsOnly(input);
  if (!d) return null;

  while (d.startsWith("00") && d.length > 2) {
    d = d.slice(2);
  }

  if (d.length === 13 && d.startsWith("880")) {
    const rest = d.slice(3);
    if (!/^1[3-9]\d{8}$/.test(rest)) return null;
    const local = `0${rest}`;
    return LOCAL_MOBILE_RE.test(local) ? local : null;
  }

  if (d.length === 11 && d.startsWith("01")) {
    return LOCAL_MOBILE_RE.test(d) ? d : null;
  }

  if (d.length === 10 && d.startsWith("1")) {
    const local = `0${d}`;
    return LOCAL_MOBILE_RE.test(local) ? local : null;
  }

  return null;
}

export function validateBangladeshPhone(input: string): boolean {
  return normalizeBangladeshPhone(input) !== null;
}

/** Match DB rows stored as local `01…` or legacy international `880…`. */
export function bangladeshPhoneDatabaseVariants(
  localCanonical: string,
): string[] {
  if (!LOCAL_MOBILE_RE.test(localCanonical)) {
    return [localCanonical];
  }
  return [localCanonical, `880${localCanonical.slice(1)}`];
}

/**
 * Display helper: group local canonical number; fall back to cleaned input.
 */
export function formatPhoneForDisplay(input: string): string {
  const n = normalizeBangladeshPhone(input);
  if (n) {
    return `${n.slice(0, 5)} ${n.slice(5, 8)} ${n.slice(8)}`;
  }
  const t = input.replace(/[\s\-().]/g, "").trim();
  return t.length ? t : "—";
}

/**
 * Digits for `wa.me/{digits}` — no leading +.
 * Accepts any input that normalizes to a valid Bangladesh mobile.
 */
export function phoneToWhatsAppNumber(input: string): string | null {
  const local = normalizeBangladeshPhone(input);
  if (!local) return null;
  return `880${local.slice(1)}`;
}

/**
 * Normalize admin-stored contact settings: valid BD mobile → `8801XXXXXXXXX` (no +);
 * otherwise digits-only (for edge / non-mobile lines).
 */
export function normalizeBdContactSettingDigits(input: string): string {
  const loc = normalizeBangladeshPhone(input);
  if (loc) return `880${loc.slice(1)}`;
  return digitsOnly(input);
}

/**
 * `tel:` link for mobile dialers (E.164 `+880…` for valid BD mobiles).
 */
export function bangladeshTelHref(input: string): string {
  const local = normalizeBangladeshPhone(input);
  if (local) {
    return `tel:+880${local.slice(1)}`;
  }
  const d = digitsOnly(input);
  let x = d;
  while (x.startsWith("00") && x.length > 2) {
    x = x.slice(2);
  }
  if (x.length === 13 && x.startsWith("880")) {
    return `tel:+${x}`;
  }
  if (x.length >= 8) {
    return `tel:+${x}`;
  }
  return `tel:${d || input}`;
}
