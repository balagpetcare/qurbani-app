import { AdminTutorialModerationControls } from "@/components/admin/AdminTutorialModerationControls";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { TutorialStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminModerationTutorialsPage() {
  const tutorials = await prisma.tutorial.findMany({
    where: { status: TutorialStatus.PENDING_APPROVAL },
    orderBy: { submittedAt: "desc" },
    take: 50,
    select: {
      id: true,
      submittedAt: true,
      author: { select: { id: true, name: true } },
      currentRevision: {
        select: {
          titleBn: true,
          summaryBn: true,
          videoUrl: true,
          posterImageUrl: true,
        },
      },
    },
  });

  return (
    <AdminAppShell>
      <AdminNav
        title="টিউটোরিয়াল মডারেশন"
        subtitle="অনুমোদনের অপেক্ষায় থাকা বিষয়বস্তু"
      />
      <AdminMain variant="narrow" className="space-y-3">
        {tutorials.length === 0 ? (
          <AdminEmptyState
            title="কিছু নেই"
            description="এখন কোনো টিউটোরিয়াল অনুমোদনের জন্য পেন্ডিং নেই।"
          />
        ) : (
          tutorials.map((t) => (
            <AdminCard key={t.id} className="space-y-1">
              <p className="font-bold text-q-primary-deep">{t.currentRevision?.titleBn ?? "—"}</p>
              <p className="text-sm text-q-muted">
                ডাক্তার: {t.author.name} · আইডি #{t.id}
              </p>
              {t.currentRevision?.summaryBn ? (
                <p className="text-sm text-q-muted line-clamp-3">{t.currentRevision.summaryBn}</p>
              ) : null}
              <p className="text-xs text-q-muted">
                জমা: {t.submittedAt ? formatDateTime(t.submittedAt) : "—"}
              </p>
              {t.currentRevision?.videoUrl ? (
                <p className="truncate text-xs text-q-muted" title={t.currentRevision.videoUrl}>
                  ভিডিও: {t.currentRevision.videoUrl}
                </p>
              ) : null}
              <AdminTutorialModerationControls tutorialId={t.id} />
            </AdminCard>
          ))
        )}
      </AdminMain>
    </AdminAppShell>
  );
}
