import { AdminCaseHistoryModerationControls } from "@/components/admin/AdminCaseHistoryModerationControls";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { PublicCaseHistoryStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminModerationCaseHistoriesPage() {
  const rows = await prisma.publicCaseHistory.findMany({
    where: { status: PublicCaseHistoryStatus.PENDING_APPROVAL },
    orderBy: { submittedAt: "desc" },
    take: 50,
    select: {
      id: true,
      submittedAt: true,
      sourceLeadId: true,
      titleBn: true,
      summaryBn: true,
      areaBucket: true,
      problemSummaryBn: true,
      authorDoctor: { select: { id: true, name: true } },
    },
  });

  return (
    <AdminAppShell>
      <AdminNav
        title="কেস হিস্ট্রি মডারেশন"
        subtitle="অনুমোদনের অপেক্ষায় থাকা পাবলিক কেস (গ্রাহকের তথ্য গোপন)"
      />
      <AdminMain variant="narrow" className="space-y-3">
        {rows.length === 0 ? (
          <AdminEmptyState
            title="কিছু নেই"
            description="এখন কোনো পাবলিক কেস হিস্ট্রি অনুমোদনের জন্য পেন্ডিং নেই।"
          />
        ) : (
          rows.map((c) => (
            <AdminCard key={c.id} className="space-y-1">
              <p className="font-bold text-q-primary-deep">{c.titleBn}</p>
              <p className="text-sm text-q-muted">
                ডাক্তার: {c.authorDoctor.name} · কেস আইডি #{c.id} · লিড #{c.sourceLeadId}
              </p>
              <p className="text-sm text-q-muted">এলাকা: {c.areaBucket}</p>
              {c.summaryBn ? (
                <p className="text-sm text-q-muted line-clamp-3">{c.summaryBn}</p>
              ) : null}
              {c.problemSummaryBn ? (
                <p className="text-sm text-q-muted line-clamp-4">{c.problemSummaryBn}</p>
              ) : null}
              <p className="text-xs text-q-muted">
                জমা: {c.submittedAt ? formatDateTime(c.submittedAt) : "—"}
              </p>
              <AdminCaseHistoryModerationControls caseHistoryId={c.id} />
            </AdminCard>
          ))
        )}
      </AdminMain>
    </AdminAppShell>
  );
}
