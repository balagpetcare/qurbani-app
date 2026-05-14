import { normalizeBdPhone } from "@/lib/server/sms/bulksmsbd";
import { hasSuccessfulLeadSmsDuplicate } from "@/lib/server/sms/sms-log.service";
import { sendSmsWithRetry } from "@/lib/server/sms/send-sms-with-retry";
import type { SendSmsSafeResult } from "@/lib/server/sms/sms.types";
import type { SmsPurpose } from "@/lib/server/sms/sms.types";
import { SMS_PURPOSE } from "@/lib/server/sms/sms.types";

import {
  logSmsAttempt,
  logSmsDedupeSkip,
  logSmsException,
  logSmsResult,
} from "@/lib/sms/logger";

export type SafeSendSmsInput = {
  to: string;
  message: string;
  purpose: SmsPurpose;
  leadId?: number | null;
  userId?: number | null;
  /** When true, skip if this lead already got a successful SMS for this purpose + destination. */
  dedupe?: boolean;
};

function toTail(phone880: string): string {
  const d = phone880.replace(/\D/g, "");
  return d.length >= 4 ? d.slice(-4) : "****";
}

/**
 * Never throws. Logs outcomes. Optional DB-backed dedupe for lead flows.
 * Uses {@link sendSmsWithRetry} for transient provider/network errors.
 */
export async function safeSendSms(input: SafeSendSmsInput): Promise<SendSmsSafeResult> {
  const norm = normalizeBdPhone(input.to);
  if (!norm.ok) {
    logSmsResult({
      purpose: input.purpose,
      leadId: input.leadId,
      toTail: "????",
      ok: false,
      status: "failed",
      internal: "invalid_phone",
    });
    return {
      ok: false,
      status: "failed",
      code: "invalid_phone",
      message: norm.errorBn,
      internal: "invalid_phone",
    };
  }

  const tail = toTail(norm.international880);

  try {
    if (input.dedupe && input.leadId != null) {
      const dup = await hasSuccessfulLeadSmsDuplicate({
        leadId: input.leadId,
        purpose: input.purpose,
        normalizedPhone880: norm.international880,
      });
      if (dup) {
        logSmsDedupeSkip({
          purpose: input.purpose,
          leadId: input.leadId,
          normalizedPhone880: norm.international880,
        });
        return {
          ok: true,
          status: "skipped",
          internal: "duplicate_suppressed",
        };
      }
    }

    logSmsAttempt({
      purpose: input.purpose,
      leadId: input.leadId,
      toTail: tail,
    });

    const r = await sendSmsWithRetry({
      to: input.to,
      message: input.message,
      purpose: input.purpose,
      leadId: input.leadId,
      userId: input.userId,
    });

    logSmsResult({
      purpose: input.purpose,
      leadId: input.leadId,
      toTail: tail,
      ok: r.ok,
      status: r.status,
      providerCode: "providerCode" in r ? r.providerCode : undefined,
      internal: "internal" in r ? r.internal : undefined,
    });

    return r;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    logSmsException({ purpose: input.purpose, leadId: input.leadId, message: msg });
    return {
      ok: false,
      status: "failed",
      code: "exception",
      message: "SMS subsystem error",
      internal: "unexpected_error",
    };
  }
}

export async function sendCustomerLeadConfirmation(input: {
  leadId: number;
  phone: string;
  message: string;
}): Promise<SendSmsSafeResult> {
  return safeSendSms({
    to: input.phone,
    message: input.message,
    purpose: SMS_PURPOSE.LEAD_CUSTOMER_INTAKE_CONFIRM,
    leadId: input.leadId,
    dedupe: true,
  });
}

export async function sendOfficeLeadAlert(input: {
  leadId: number;
  officePhoneRaw: string;
  message: string;
}): Promise<SendSmsSafeResult> {
  return safeSendSms({
    to: input.officePhoneRaw,
    message: input.message,
    purpose: SMS_PURPOSE.LEAD_OFFICE_INTAKE,
    leadId: input.leadId,
    dedupe: true,
  });
}
