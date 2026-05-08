import { NextResponse } from "next/server";

import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { buildDoctorFinanceSummary } from "@/lib/doctor-finance-summary";
import { getBillingPlatformCommissionRatePercent } from "@/lib/site-settings";

export async function GET(request: Request) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const rate = await getBillingPlatformCommissionRatePercent();
    const summary = await buildDoctorFinanceSummary(auth.user.id, rate);
    return NextResponse.json(summary);
  } catch (err) {
    console.error("GET /api/doctor/finance", err);
    return NextResponse.json(
      { error: "ফিন্যান্স তথ্য লোড করা যায়নি" },
      { status: 500 },
    );
  }
}
