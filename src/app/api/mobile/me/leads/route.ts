import { NextResponse } from "next/server";

import { CUSTOMER_PHONE_REQUIRED_BN, CUSTOMER_UNAUTHORIZED_BN } from "@/lib/mobile-customer-otp-messages";
import { getMobileCustomerAuth } from "@/lib/mobile-customer-auth";
import { fetchCustomerLeadsForPhone } from "@/lib/mobile-customer-leads";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(request: Request) {
  const auth = await getMobileCustomerAuth(request);
  if (!auth) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", messageBn: CUSTOMER_UNAUTHORIZED_BN },
      { status: 401 },
    );
  }
  if (!auth.phoneCanon || !auth.phoneVerified) {
    return NextResponse.json(
      { error: "PHONE_REQUIRED", messageBn: CUSTOMER_PHONE_REQUIRED_BN },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const raw = url.searchParams.get("limit");
  let limit = DEFAULT_LIMIT;
  if (raw) {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n > 0) {
      limit = Math.min(n, MAX_LIMIT);
    }
  }

  try {
    const leads = await fetchCustomerLeadsForPhone(auth.phoneCanon, limit);
    return NextResponse.json({ leads });
  } catch (e) {
    console.error("GET /api/mobile/me/leads", e);
    return NextResponse.json(
      { error: "SERVER_ERROR", messageBn: "লোড করা যায়নি। আবার চেষ্টা করুন।" },
      { status: 500 },
    );
  }
}
