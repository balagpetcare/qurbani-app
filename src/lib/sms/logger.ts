/**
 * Structured SMS logging (stdout). Never log full MSISDN or API keys.
 */
export type SmsLogEvent =
  | "sms_attempt"
  | "sms_result"
  | "sms_retry"
  | "sms_dedupe_skip"
  | "sms_exception"
  | "sms_provider_response";

function line(event: SmsLogEvent, payload: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      service: "qurbani-app",
      channel: "sms",
      event,
      ...payload,
    }),
  );
}

export function logSmsAttempt(meta: {
  purpose: string;
  leadId?: number | null;
  toTail: string;
  attempt?: number;
  maxAttempts?: number;
}): void {
  line("sms_attempt", meta);
}

export function logSmsResult(meta: {
  purpose: string;
  leadId?: number | null;
  toTail: string;
  ok: boolean;
  status: string;
  providerCode?: string | null;
  internal?: string;
  retry?: boolean;
}): void {
  line("sms_result", meta);
}

export function logSmsRetry(meta: {
  purpose: string;
  leadId?: number | null;
  attempt: number;
  maxAttempts: number;
  reason: string;
}): void {
  line("sms_retry", meta);
}

export function logSmsDedupeSkip(meta: {
  purpose: string;
  leadId: number;
  normalizedPhone880: string;
}): void {
  line("sms_dedupe_skip", {
    ...meta,
    normalizedPhone880: `***${meta.normalizedPhone880.slice(-4)}`,
  });
}

export function logSmsException(meta: {
  purpose: string;
  leadId?: number | null;
  message: string;
}): void {
  line("sms_exception", {
    ...meta,
    message: meta.message.slice(0, 240),
  });
}

export function logSmsProviderResponse(meta: {
  purpose: string;
  leadId?: number | null;
  httpStatus: number;
  responseCode: string;
  bodySnippet: string;
}): void {
  line("sms_provider_response", {
    ...meta,
    bodySnippet: meta.bodySnippet.slice(0, 200),
  });
}
