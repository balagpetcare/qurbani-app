import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { UserRole } from "@/generated/prisma/enums";
import { requireDoctorFromRequest } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const auth = await requireDoctorFromRequest(request);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "বর্তমান ও নতুন পাসওয়ার্ড দিন।" },
      { status: 400 },
    );
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।" },
      { status: 400 },
    );
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: auth.user.id, role: UserRole.DOCTOR },
      select: { id: true, passwordHash: true },
    });
    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "পাসওয়ার্ড পরিবর্তন সমর্থিত নয়। অ্যাডমিনের সাথে যোগাযোগ করুন।" },
        { status: 400 },
      );
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "বর্তমান পাসওয়ার্ড ভুল।" },
        { status: 401 },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/doctor/me/password", err);
    return NextResponse.json({ error: "পাসওয়ার্ড আপডেট ব্যর্থ।" }, { status: 500 });
  }
}
