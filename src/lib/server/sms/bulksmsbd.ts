import { normalizeBangladeshPhone } from "@/lib/phone";

import { getBulkSmsBaseUrl } from "@/lib/server/sms/sms-env";

/** Bangla-safe user-facing invalid mobile message. */
export const BD_PHONE_INVALID_FOR_SMS_BN =
  "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন ০১৭… বা +৮৮০…)।";

export type NormalizedBd880 =
  | { ok: true; international880: string }
  | { ok: false; errorBn: string };

/**
 * Normalize any common BD mobile input to BulkSMSBD `number` format: `8801XXXXXXXXX` (no +).
 */
export function normalizeBdPhone(input: string): NormalizedBd880 {
  const t = typeof input === "string" ? input.trim() : "";
  if (!t) {
    return { ok: false, errorBn: BD_PHONE_INVALID_FOR_SMS_BN };
  }

  let d = t.replace(/\D/g, "");
  while (d.startsWith("00") && d.length > 2) d = d.slice(2);

  if (d.length === 13 && d.startsWith("880")) {
    const rest = d.slice(3);
    if (/^1[3-9]\d{8}$/.test(rest)) {
      return { ok: true, international880: d };
    }
    return { ok: false, errorBn: BD_PHONE_INVALID_FOR_SMS_BN };
  }

  const local = normalizeBangladeshPhone(t);
  if (!local) {
    return { ok: false, errorBn: BD_PHONE_INVALID_FOR_SMS_BN };
  }
  return { ok: true, international880: `880${local.slice(1)}` };
}

export type MappedProviderCode = {
  ok: boolean;
  internalCode: string;
  userMessage: string;
  adminHint?: string;
};

/** Map BulkSMSBD numeric response codes to safe internal messages (English for logs/admin UI). */
export function mapBulkSmsResponseCode(codeStr: string): MappedProviderCode {
  const n = codeStr.trim();
  switch (n) {
    case "202":
      return {
        ok: true,
        internalCode: "sent",
        userMessage: "SMS queued successfully",
      };
    case "1001":
      return {
        ok: false,
        internalCode: "invalid_number",
        userMessage: "Invalid mobile number",
      };
    case "1002":
      return {
        ok: false,
        internalCode: "sender_id",
        userMessage: "Sender ID incorrect or disabled",
      };
    case "1003":
      return {
        ok: false,
        internalCode: "missing_fields",
        userMessage: "Required fields missing — contact SMS provider",
      };
    case "1005":
      return {
        ok: false,
        internalCode: "internal_error",
        userMessage: "SMS provider internal error",
      };
    case "1006":
      return {
        ok: false,
        internalCode: "balance_validity",
        userMessage: "SMS balance validity not available",
      };
    case "1007":
      return {
        ok: false,
        internalCode: "balance_insufficient",
        userMessage:
          "Insufficient SMS balance — please recharge the BulkSMSBD account",
        adminHint: "balance_insufficient",
      };
    case "1011":
      return {
        ok: false,
        internalCode: "user_not_found",
        userMessage: "SMS account not found for this API key",
      };
    case "1012":
      return {
        ok: false,
        internalCode: "masking_bengali",
        userMessage: "Masking SMS must be sent in Bengali",
      };
    case "1013":
    case "1014":
    case "1015":
      return {
        ok: false,
        internalCode: "gateway",
        userMessage: "Sender ID / gateway configuration error",
      };
    case "1016":
    case "1017":
      return {
        ok: false,
        internalCode: "pricing",
        userMessage: "Sender pricing information error",
      };
    case "1018":
      return {
        ok: false,
        internalCode: "account_disabled",
        userMessage: "SMS account disabled",
      };
    case "1019":
      return {
        ok: false,
        internalCode: "price_disabled",
        userMessage: "Sender price disabled",
      };
    case "1020":
    case "1021":
      return {
        ok: false,
        internalCode: "parent_account",
        userMessage: "Parent SMS account configuration error",
      };
    case "1031":
      return {
        ok: false,
        internalCode: "not_verified",
        userMessage: "SMS account not verified",
      };
    case "1032":
      return {
        ok: false,
        internalCode: "ip_whitelist",
        userMessage: "SMS IP whitelist problem — allow this server IP at BulkSMSBD",
        adminHint: "ip_whitelist",
      };
    default:
      return {
        ok: false,
        internalCode: "unknown",
        userMessage: `SMS provider returned code ${n || "(empty)"}`,
      };
  }
}

/**
 * Extract provider response code from typical BulkSMSBD bodies (plain text or JSON).
 */
export function extractResponseCodeFromBody(body: string): string {
  const t = body.trim();
  if (!t) return "";

  try {
    const j = JSON.parse(t) as Record<string, unknown>;
    const candidates = ["code", "response_code", "status", "error_code"];
    for (const k of candidates) {
      const v = j[k];
      if (typeof v === "number") return String(v);
      if (typeof v === "string") return v.trim();
    }
  } catch {
    /* not JSON */
  }

  const m = t.match(/\b(\d{3,4})\b/);
  return m?.[1] ?? t.slice(0, 32);
}

export async function postBulkSmsApi(form: URLSearchParams): Promise<{
  ok: boolean;
  httpStatus: number;
  rawBody: string;
  code: string;
  mapped: MappedProviderCode;
}> {
  const base = getBulkSmsBaseUrl();
  const url = `${base}/smsapi`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const rawBody = await res.text().catch(() => "");
  const code = extractResponseCodeFromBody(rawBody);
  const mapped = mapBulkSmsResponseCode(code);
  return {
    ok: mapped.ok && res.ok,
    httpStatus: res.status,
    rawBody,
    code,
    mapped,
  };
}

export async function fetchSmsBalance(): Promise<{
  ok: boolean;
  httpStatus: number;
  body: string;
}> {
  const key = process.env.BULKSMSBD_API_KEY?.trim();
  if (!key) {
    return { ok: false, httpStatus: 0, body: "missing_api_key" };
  }
  const base = getBulkSmsBaseUrl();
  const url = `${base}/getBalanceApi?api_key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { method: "GET" });
  const body = await res.text().catch(() => "");
  return { ok: res.ok, httpStatus: res.status, body };
}
