import { NextResponse } from "next/server";

import { requireAdminFromRequest } from "@/lib/auth-guards";
import {
  fetchAdminDoctorFinanceList,
  parseAdminDoctorFinanceParams,
} from "@/lib/admin-doctor-finance";

export async function GET(request: Request) {
  const auth = await requireAdminFromRequest(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const raw = Object.fromEntries(searchParams.entries());
  const parsed = parseAdminDoctorFinanceParams(raw);

  try {
    const data = await fetchAdminDoctorFinanceList(parsed);
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/admin/doctor-finance", err);
    return NextResponse.json(
      { error: "ডেটা লোড করা যায়নি। একটু পরে আবার চেষ্টা করুন।" },
      { status: 500 },
    );
  }
}
