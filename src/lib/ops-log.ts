import { normalizeBangladeshPhone } from "@/lib/phone";

/**
 * Mask canonical `01XXXXXXXXX` or raw input for structured logs — **never log full MSISDN**.
 */
export function maskPhoneForLog(input: string): string {
  const n = normalizeBangladeshPhone(input);
  const digits = (n ?? input).replace(/\D/g, "");
  if (digits.length < 4) return "[phone]";
  return `***${digits.slice(-4)}`;
}

/** e.g. `a***@example.com` — avoids logging full applicant email in ops logs. */
export function maskEmailForLog(email: string): string {
  const t = email.trim().toLowerCase();
  const at = t.indexOf("@");
  if (at < 1) return "[email]";
  const user = t.slice(0, at);
  const domain = t.slice(at + 1);
  const prefix = user.slice(0, Math.min(1, user.length));
  return `${prefix}***@${domain}`;
}

type OpsPayload = Record<string, string | number | boolean | null | undefined>;

/**
 * Single JSON line to stdout — safe for log aggregators; **no addresses or clinical text**.
 */
export function logOps(event: string, payload: OpsPayload): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    service: "qurbani-app",
    event,
    ...payload,
  });
  console.log(line);
}
