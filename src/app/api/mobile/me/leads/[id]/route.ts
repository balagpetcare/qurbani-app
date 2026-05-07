import { NextResponse } from "next/server";

import {
  CUSTOMER_LEAD_NOT_FOUND_BN,
  CUSTOMER_PHONE_REQUIRED_BN,
  CUSTOMER_UNAUTHORIZED_BN,
} from "@/lib/mobile-customer-otp-messages";
import { getMobileCustomerAuth } from "@/lib/mobile-customer-auth";
import { fetchCustomerLeadDetailForPhone } from "@/lib/mobile-customer-leads";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Params) {
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

  const { id: raw } = await ctx.params;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json(
      { error: "INVALID_ID", messageBn: CUSTOMER_LEAD_NOT_FOUND_BN },
      { status: 400 },
    );
  }

  try {
    const lead = await fetchCustomerLeadDetailForPhone(auth.phoneCanon, id);
    if (!lead) {
      return NextResponse.json(
        { error: "NOT_FOUND", messageBn: CUSTOMER_LEAD_NOT_FOUND_BN },
        { status: 404 },
      );
    }
    return NextResponse.json({ lead });
  } catch (e) {
    console.error("GET /api/mobile/me/leads/[id]", e);
    return NextResponse.json(
      { error: "SERVER_ERROR", messageBn: "লোড করা যায়নি। আবার চেষ্টা করুন।" },
      { status: 500 },
    );
  }
}
