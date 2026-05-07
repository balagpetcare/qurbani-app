import { AdminNav } from "@/components/admin/AdminNav";
import { AreasAdminPanel } from "@/components/admin/AreasAdminPanel";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { LeadStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAreasPage() {
  const areas = await prisma.area.findMany({
    orderBy: [{ zone: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      nameBn: true,
      nameEn: true,
      zone: true,
      isPopular: true,
      sortOrder: true,
      isActive: true,
      note: true,
      _count: {
        select: {
          doctors: true,
          leads: {
            where: {
              status: {
                notIn: [
                  LeadStatus.COMPLETED,
                  LeadStatus.CANCELLED,
                  LeadStatus.REFERRED,
                ],
              },
            },
          },
        },
      },
    },
  });

  return (
    <AdminAppShell>
      <AdminNav title="এলাকা ব্যবস্থাপনা" subtitle="সেবার এলাকা — তালিকা, জোন ও ব্যবহার" />

      <AdminMain variant="narrow" className="space-y-4">
        <p className="text-sm leading-relaxed text-q-muted">
          পাবলিক ফর্ম ও ডাক্তার এলাকা নির্বাচন সক্রিয় এলাকা থেকে আসে। নিষ্ক্রিয় এলাকা নতুন
          লিডে দেখাবে না। “অন্যান্য” লিড এখন টেক্সট হিসেবে সংরক্ষিত হয়।
        </p>

        {areas.length === 0 ? (
          <AdminEmptyState
            title="কোনো এলাকা নেই"
            description="ডাটাবেস সিড চালান বা মাইগ্রেশন যাচাই করুন।"
          />
        ) : (
          <AreasAdminPanel initialAreas={areas} />
        )}
      </AdminMain>
    </AdminAppShell>
  );
}
