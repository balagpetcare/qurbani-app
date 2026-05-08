import { NextResponse } from "next/server";

import { requireMainAdminFromRequest } from "@/lib/auth-guards";
import { getSmsBalanceSafe } from "@/lib/server/sms/sms.service";
import {
  isLegacyOtpSmsFlagOn,
  isOutboundSmsEnabled,
  isSmsDryRun,
} from "@/lib/server/sms/sms-env";

export async function GET(request: Request) {
  const auth = await requireMainAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const b = await getSmsBalanceSafe();
  const rawPreview = b.raw.length > 220 ? `${b.raw.slice(0, 220)}…` : b.raw;

  return NextResponse.json({
    ok: true,
    smsEnabled: isOutboundSmsEnabled(),
    legacyOtpFlag: isLegacyOtpSmsFlagOn(),
    dryRun: isSmsDryRun(),
    balance: {
      httpStatus: b.httpStatus,
      reachable: b.ok,
      rawPreview,
    },
    hintBn:
      "SMS API key server-side .env থেকে নিয়ন্ত্রিত হয়।",
  });
}
