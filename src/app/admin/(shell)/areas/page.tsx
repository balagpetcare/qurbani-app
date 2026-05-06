import { AdminNav } from "@/components/admin/AdminNav";
import { AreaAdminRow } from "@/components/admin/AreaAdminRow";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { LeadStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAreasPage() {
  const areas = await prisma.area.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      nameBn: true,
      sortOrder: true,
      isActive: true,
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
      <AdminNav title="এলাকা ব্যবস্থাপনা" subtitle="সেড করা এলাকা ও ব্যবহার পরিসংখ্যান" />

      <AdminMain variant="narrow" className="space-y-4">
        <p className="text-sm leading-relaxed text-q-muted">
          পাবলিক ফর্ম ও ডাক্তার এলাকা নির্বাচন এই তালিকা থেকে আসে। নিষ্ক্রিয় এলাকা নতুন
          লিডে দেখাবে না।
        </p>

        {areas.length === 0 ? (
          <AdminEmptyState
            title="কোনো এলাকা নেই"
            description="ডাটাবেস সিড চালান বা মাইগ্রেশন যাচাই করুন।"
          />
        ) : (
          <ul className="space-y-3">
            {areas.map((a) => (
              <li key={a.id}>
                <AreaAdminRow area={a} />
              </li>
            ))}
          </ul>
        )}
      </AdminMain>
    </AdminAppShell>
  );
}
