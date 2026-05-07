import { NextResponse } from "next/server";

import { CUSTOMER_UNAUTHORIZED_BN } from "@/lib/mobile-customer-otp-messages";
import { getMobileCustomerAuth } from "@/lib/mobile-customer-auth";

export async function GET(request: Request) {
  const auth = await getMobileCustomerAuth(request);
  if (!auth) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", messageBn: CUSTOMER_UNAUTHORIZED_BN },
      { status: 401 },
    );
  }

  return NextResponse.json({
    id: auth.userId,
    phone: auth.phoneCanon,
    name: auth.name,
    role: "CUSTOMER",
    email: auth.email,
    phoneVerified: auth.phoneVerified,
  });
}
