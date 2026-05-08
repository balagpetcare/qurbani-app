import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS = 3;
const MIN_GAP_MS = 60 * 1000;

/** DB-backed OTP send pacing (per-instance IP limits still apply separately). */
export async function assertOtpSendDbRules(
  phoneCanon: string,
): Promise<{ ok: true } | { ok: false; messageBn: string }> {
  const since = new Date(Date.now() - WINDOW_MS);
  const recentCount = await prisma.customerOtpChallenge.count({
    where: {
      phoneCanon,
      createdAt: { gte: since },
    },
  });
  if (recentCount >= MAX_SENDS) {
    return {
      ok: false,
      messageBn: "অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন",
    };
  }

  const last = await prisma.customerOtpChallenge.findFirst({
    where: { phoneCanon },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (last && Date.now() - last.createdAt.getTime() < MIN_GAP_MS) {
    return {
      ok: false,
      messageBn: "অনুগ্রহ করে কিছুক্ষণ পরে আবার চেষ্টা করুন",
    };
  }

  return { ok: true };
}
