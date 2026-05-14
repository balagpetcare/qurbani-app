import { sendSms } from "@/lib/server/sms/sms.service";
import type { SendSmsSafeResult } from "@/lib/server/sms/sms.types";
import type { SmsPurpose } from "@/lib/server/sms/sms.types";

function shouldRetry(result: SendSmsSafeResult): boolean {
  if (result.ok) return false;
  const internal = "internal" in result ? result.internal : undefined;
  if (internal === "http_error") return true;
  if (internal === "provider_error") return true;
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Best-effort retries for transient provider/network failures (BulkSMSBD).
 */
export async function sendSmsWithRetry(input: {
  to: string;
  message: string;
  purpose: SmsPurpose;
  leadId?: number | null;
  userId?: number | null;
  maxAttempts?: number;
}): Promise<SendSmsSafeResult> {
  const max = Math.min(5, Math.max(1, input.maxAttempts ?? 3));
  let last: SendSmsSafeResult | null = null;
  for (let attempt = 1; attempt <= max; attempt++) {
    last = await sendSms(input);
    if (!shouldRetry(last)) return last;
    if (attempt < max) {
      await delay(350 * attempt);
    }
  }
  return last!;
}
