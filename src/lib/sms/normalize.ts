/**
 * Bangladesh mobile normalization for SMS (BulkSMSBD `number` field: `8801XXXXXXXXX`).
 * Delegates to the canonical server implementation.
 */
import type { NormalizedBd880 } from "@/lib/server/sms/bulksmsbd";
import { normalizeBdPhone } from "@/lib/server/sms/bulksmsbd";

export type { NormalizedBd880 };

/** @alias normalizeBdPhone — consistent name for lead/SMS modules. */
export function normalizeBangladeshPhone(input: string): NormalizedBd880 {
  return normalizeBdPhone(input);
}
