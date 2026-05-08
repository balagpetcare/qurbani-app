import { NextResponse } from "next/server";

import { requireAdminFromRequest } from "@/lib/auth-guards";
import {
  fetchAdminDoctorFinanceDetail,
  parseAdminDoctorFinanceParams,
} from "@/lib/admin-doctor-finance";

type RouteContext = { params: Promise<{ doctorId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const rawId = (await context.params).doctorId;
  const doctorUserId = parseInt(rawId, 10);
  if (Number.isNaN(doctorUserId)) {
    return NextResponse.json({ error: "অবৈধ ডাক্তার আইডি" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const raw = Object.fromEntries(searchParams.entries());
  const parsed = parseAdminDoctorFinanceParams(raw);

  try {
    const data = await fetchAdminDoctorFinanceDetail(doctorUserId, parsed);
    if (!data) {
      return NextResponse.json({ error: "ডাক্তার পাওয়া যায়নি" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/admin/doctor-finance/[doctorId]", err);
    return NextResponse.json(
      { error: "ডেটা লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।" },
      { status: 500 },
    );
  }
}
