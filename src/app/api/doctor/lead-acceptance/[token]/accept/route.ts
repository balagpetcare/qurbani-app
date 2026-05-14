import { NextResponse } from "next/server";

import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { acceptLeadClaimByToken } from "@/lib/lead-acceptance/accept-lead-by-token";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  const { token: raw } = await context.params;
  const token = decodeURIComponent(raw ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  try {
    const result = await acceptLeadClaimByToken({
      token,
      doctorUserId: auth.user.id,
      doctorName: auth.user.name,
    });

    if (result.kind === "not_found") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (result.kind === "forbidden_area") {
      return NextResponse.json(
        {
          error:
            "এই লিডটি আপনার নির্ধারিত সেবা এলাকার বাইরে। শুধুমাত্র মিলিয়ে যাওয়া এলাকার ডাক্তার গ্রহণ করতে পারবেন।",
        },
        { status: 403 },
      );
    }
    if (result.kind === "bad_state") {
      return NextResponse.json(
        { error: "এই অবস্থায় লিড গ্রহণ করা যাচ্ছে না" },
        { status: 400 },
      );
    }
    if (result.kind === "taken") {
      return NextResponse.json(
        {
          error: "Already accepted by another doctor.",
          messageBn: "কেসটি ইতিমধ্যে অন্য ডাক্তার নিয়েছেন",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      leadId: result.leadId,
      fullPhone: result.fullPhone,
      doctorLeadUrl: `/doctor/leads/${result.leadId}`,
    });
  } catch (err) {
    console.error("POST /api/doctor/lead-acceptance/[token]/accept", err);
    return NextResponse.json(
      { error: "Failed to accept lead" },
      { status: 500 },
    );
  }
}
