import { prisma } from "@/lib/prisma";
import { collectAreaTextMatchFragments } from "@/lib/doctor-lead-access";

/**
 * True when the doctor is allowed to claim this lead by service area
 * (canonical areaId match or custom-area label overlap).
 */
export async function doctorMatchesLeadServiceArea(
  doctorUserId: number,
  lead: { areaId: number | null; area: string | null },
): Promise<boolean> {
  if (lead.areaId != null) {
    const row = await prisma.doctorArea.findFirst({
      where: { userId: doctorUserId, areaId: lead.areaId },
      select: { areaId: true },
    });
    return row != null;
  }

  const rows = await prisma.doctorArea.findMany({
    where: { userId: doctorUserId },
    select: { area: { select: { name: true, nameBn: true, nameEn: true } } },
  });
  const fragments = collectAreaTextMatchFragments(rows.map((r) => r.area));
  const custom = lead.area?.trim();
  if (!custom || fragments.length === 0) return false;
  const lower = custom.toLowerCase();
  return fragments.some((f) => lower.includes(f.toLowerCase()));
}
