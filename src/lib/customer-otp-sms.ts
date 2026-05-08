/**
 * Sends OTP via BulkSMSBD when SMS is enabled (server-side env).
 * Never exposes secrets or OTP in logs (OTP bodies are redacted in SMS audit rows).
 */
import { sendSms } from "@/lib/server/sms/sms.service";
import { buildOtpSmsBody } from "@/lib/server/sms/sms.templates";
import { SMS_PURPOSE } from "@/lib/server/sms/sms.types";

export async function sendCustomerOtpSmsIfConfigured(
  phoneCanonLocal: string,
  plainCode: string,
): Promise<{
  sent: boolean;
  reason: "disabled" | "missing_env" | "ok" | "http_error" | "dry_run";
}> {
  const r = await sendSms({
    to: phoneCanonLocal,
    message: buildOtpSmsBody(plainCode),
    purpose: SMS_PURPOSE.OTP,
  });

  if (r.ok && r.status === "sent") {
    return { sent: true, reason: "ok" };
  }

  if (r.ok && r.status === "skipped" && r.dryRun) {
    return { sent: false, reason: "dry_run" };
  }

  if (r.ok && r.status === "skipped") {
    return { sent: false, reason: "disabled" };
  }

  if (!r.ok && r.internal === "missing_env") {
    return { sent: false, reason: "missing_env" };
  }

  return { sent: false, reason: "http_error" };
}
