import { SmsLogStatus } from "@/generated/prisma/enums";
import {
  fetchSmsBalance,
  normalizeBdPhone,
  postBulkSmsApi,
} from "@/lib/server/sms/bulksmsbd";
import {
  getSmsApiKey,
  getSmsBrandName,
  getSmsSenderId,
  isLegacyOtpSmsFlagOn,
  isOutboundSmsEnabled,
  isSmsDryRun,
} from "@/lib/server/sms/sms-env";
import {
  finalizeSmsLog,
  insertSmsLogPending,
  redactSmsPreview,
} from "@/lib/server/sms/sms-log.service";
import type { SendSmsSafeResult, SmsPurpose } from "@/lib/server/sms/sms.types";

function hasBulkSmsCredentials(): boolean {
  return Boolean(getSmsApiKey() && getSmsSenderId());
}

function smsAllowedForPurpose(purpose: SmsPurpose): boolean {
  if (isOutboundSmsEnabled()) return true;
  if (purpose === "otp" && isLegacyOtpSmsFlagOn()) return true;
  return false;
}

function logSmsDebug(msg: string, meta?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return;
  if (meta) {
    console.info(`[sms] ${msg}`, meta);
  } else {
    console.info(`[sms] ${msg}`);
  }
}

/**
 * Sends one SMS via BulkSMSBD. Server-only; never throws to callers for provider errors.
 */
export async function sendSms(input: {
  to: string;
  message: string;
  purpose: SmsPurpose;
  leadId?: number | null;
  userId?: number | null;
}): Promise<SendSmsSafeResult> {
  const norm = normalizeBdPhone(input.to);
  if (!norm.ok) {
    return {
      ok: false,
      status: "failed",
      code: "invalid_phone",
      message: norm.errorBn,
      internal: "invalid_phone",
    };
  }

  const preview = redactSmsPreview(input.message, input.purpose);
  const phoneTail = norm.international880.slice(-4);

  let logId: string | null = null;
  try {
    logId = await insertSmsLogPending({
      phoneRaw: norm.international880.replace(/^880/, "0"),
      normalizedPhone: norm.international880,
      messagePreview: preview,
      purpose: input.purpose,
      leadId: input.leadId,
      userId: input.userId,
    });
  } catch (e) {
    console.error("[sms] sms_log insert failed", e);
  }

  const finalize = async (
    status: SmsLogStatus,
    providerCode?: string | null,
    providerMessage?: string | null,
  ) => {
    if (!logId) return;
    try {
      await finalizeSmsLog(logId, { status, providerCode, providerMessage });
    } catch (e) {
      console.error("[sms] sms_log finalize failed", e);
    }
  };

  if (!smsAllowedForPurpose(input.purpose)) {
    await finalize(SmsLogStatus.SKIPPED, "disabled", "SMS_DISABLED");
    logSmsDebug("skipped disabled", { purpose: input.purpose });
    return {
      ok: true,
      status: "skipped",
      internal: "sms_disabled",
    };
  }

  if (!hasBulkSmsCredentials()) {
    await finalize(SmsLogStatus.SKIPPED, "missing_env", "MISSING_BULKSMSBD_CREDS");
    logSmsDebug("skipped missing credentials");
    return {
      ok: false,
      status: "skipped",
      code: "missing_env",
      message: "BulkSMSBD credentials not configured",
      internal: "missing_env",
    };
  }

  if (isSmsDryRun()) {
    await finalize(SmsLogStatus.SKIPPED, "dry_run", "SMS_DRY_RUN");
    logSmsDebug("dry_run", {
      purpose: input.purpose,
      toTail: phoneTail,
      brand: getSmsBrandName(),
    });
    return {
      ok: true,
      status: "skipped",
      dryRun: true,
      internal: "dry_run",
    };
  }

  const apiKey = getSmsApiKey();
  const senderId = getSmsSenderId();

  const form = new URLSearchParams();
  form.set("api_key", apiKey);
  form.set("type", "text");
  form.set("number", norm.international880);
  form.set("senderid", senderId);
  form.set("message", input.message);

  try {
    const r = await postBulkSmsApi(form);
    const providerMsg =
      r.mapped.adminHint === "balance_insufficient"
        ? r.mapped.userMessage
        : r.mapped.userMessage;

    if (r.mapped.ok) {
      await finalize(SmsLogStatus.SENT, r.code, providerMsg.slice(0, 500));
      return {
        ok: true,
        status: "sent",
        providerCode: r.code,
      };
    }

    await finalize(SmsLogStatus.FAILED, r.code, providerMsg.slice(0, 500));

    const safeMsg =
      r.mapped.internalCode === "ip_whitelist"
        ? "SMS IP whitelist problem"
        : r.mapped.internalCode === "balance_insufficient"
          ? "Insufficient SMS balance on provider account"
          : "SMS send failed";

    if (process.env.NODE_ENV !== "production") {
      console.warn("[sms] provider error", r.code, r.mapped.internalCode);
    }

    return {
      ok: false,
      status: "failed",
      code: "provider_error",
      message: safeMsg,
      providerCode: r.code,
      internal: r.mapped.internalCode,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : "fetch_failed";
    await finalize(SmsLogStatus.FAILED, "http", err.slice(0, 300));
    console.error("[sms] fetch error", err);
    return {
      ok: false,
      status: "failed",
      code: "http_error",
      message: "SMS network error",
      internal: "http_error",
    };
  }
}

export async function getSmsBalanceSafe(): Promise<{
  ok: boolean;
  raw: string;
  httpStatus: number;
}> {
  const b = await fetchSmsBalance();
  return { ok: b.ok, raw: b.body, httpStatus: b.httpStatus };
}
