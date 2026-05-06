import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { LeadPriorityBadge } from "@/components/admin/LeadPriorityBadge";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { AdminPageSection } from "@/components/admin/ui/AdminPageSection";
import { AdminResponsiveTable } from "@/components/admin/ui/AdminResponsiveTable";
import { AdminStatCard } from "@/components/admin/ui/AdminStatCard";
import { AdminStatGrid } from "@/components/admin/ui/AdminStatGrid";
import { LeadStatus } from "@/generated/prisma/enums";
import { UserRole } from "@/generated/prisma/enums";
import { adminLeadDetailPath } from "@/lib/admin-routes";
import { formatDateTime } from "@/lib/format";
import { formatLeadAnimalDisplay } from "@/lib/lead-display";
import { leadProblemSummaryShort } from "@/lib/lead-privacy";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function AdminDashboardPage() {
  const dayStart = startOfToday();

  const [
    totalLeads,
    newLeads,
    inProgressLeads,
    observedLeads,
    completedLeads,
    cancelledLeads,
    todayLeads,
    activeDoctors,
    recentLeads,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: LeadStatus.NEW } }),
    prisma.lead.count({ where: { status: LeadStatus.IN_PROGRESS } }),
    prisma.lead.count({ where: { status: LeadStatus.OBSERVED } }),
    prisma.lead.count({ where: { status: LeadStatus.COMPLETED } }),
    prisma.lead.count({ where: { status: LeadStatus.CANCELLED } }),
    prisma.lead.count({
      where: { createdAt: { gte: dayStart } },
    }),
    prisma.user.count({
      where: { role: UserRole.DOCTOR, isActive: true },
    }),
    prisma.lead.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerName: true,
        animalType: true,
        animalKind: true,
        problemCategory: true,
        problemDetails: true,
        serviceRequirement: true,
        priority: true,
        status: true,
        createdAt: true,
        assignedDoctorId: true,
        assignedDoctor: { select: { name: true } },
        selectedArea: { select: { name: true } },
      },
    }),
  ]);

  const summary: {
    label: string;
    value: number;
    accent: "default" | "gold" | "danger";
  }[] = [
    { label: "মোট লিড", value: totalLeads, accent: "default" },
    { label: "নতুন", value: newLeads, accent: "default" },
    { label: "চলমান", value: inProgressLeads, accent: "default" },
    { label: "পর্যবেক্ষণ", value: observedLeads, accent: "default" },
    { label: "সম্পন্ন", value: completedLeads, accent: "default" },
    { label: "বাতিল", value: cancelledLeads, accent: "danger" },
    { label: "আজকের লিড", value: todayLeads, accent: "gold" },
    { label: "সক্রিয় ডাক্তার", value: activeDoctors, accent: "default" },
  ];

  return (
    <AdminAppShell>
      <AdminNav title="ড্যাশবোর্ড" subtitle="কুরবানি ২০২৬" />

      <AdminMain className="space-y-10">
        <AdminPageSection title="সারাংশ" description="দ্রুত সংখ্যা · কুরবানি ২০২৬">
          <AdminStatGrid className="mt-1">
            {summary.map((card) => (
              <AdminStatCard
                key={card.label}
                label={card.label}
                value={card.value}
                accent={card.accent}
              />
            ))}
          </AdminStatGrid>
        </AdminPageSection>

        <AdminPageSection
          title="সাম্প্রতিক লিড"
          description="সর্বশেষ লিডগুলো আগে দেখানো হচ্ছে"
          action={
            <Link
              href="/admin/requests"
              className="inline-flex min-h-[var(--q-touch-min)] items-center rounded-2xl border-2 border-q-primary bg-q-primary-soft px-4 text-sm font-bold text-q-primary-deep touch-manipulation hover:bg-emerald-100"
            >
              সব লিড →
            </Link>
          }
        >
          {recentLeads.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/60 px-6 py-12 text-center text-sm leading-relaxed text-zinc-600 sm:text-base">
              এখনও কোনো লিড নেই। পাবলিক পেজ থেকে{" "}
              <Link href="/request" className="font-medium text-emerald-700 underline">
                অনুরোধ ফর্ম
              </Link>{" "}
              জমা দিন।
            </p>
          ) : (
            <>
              <AdminResponsiveTable className="mt-4 hidden md:block">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">অগ্রাধিকার</th>
                      <th className="px-4 py-3 font-semibold">গ্রাহক</th>
                      <th className="px-4 py-3 font-semibold">এলাকা</th>
                      <th className="px-4 py-3 font-semibold">পশু</th>
                      <th className="px-4 py-3 font-semibold">সমস্যা</th>
                      <th className="px-4 py-3 font-semibold">স্ট্যাটাস</th>
                      <th className="px-4 py-3 font-semibold">ডাক্তার</th>
                      <th className="px-4 py-3 font-semibold">সময়</th>
                      <th className="px-4 py-3 font-semibold">কর্ম</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {recentLeads.map((lead) => {
                      const summary = leadProblemSummaryShort({
                        problemCategory: lead.problemCategory,
                        problemDetails: lead.problemDetails,
                        serviceRequirement: lead.serviceRequirement,
                      });
                      return (
                      <tr key={lead.id} className="hover:bg-zinc-50/80">
                        <td className="px-4 py-3">
                          <LeadPriorityBadge priority={lead.priority} />
                        </td>
                        <td className="px-4 py-3 font-medium text-zinc-900">
                          {lead.customerName}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {lead.selectedArea?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {formatLeadAnimalDisplay(lead.animalKind, lead.animalType)}
                        </td>
                        <td
                          className="max-w-[10rem] truncate px-4 py-3 text-zinc-600"
                          title={summary}
                        >
                          {summary}
                        </td>
                        <td className="px-4 py-3">
                          <LeadStatusBadge status={lead.status} />
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {lead.assignedDoctor?.name ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                          {formatDateTime(lead.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={adminLeadDetailPath(lead.id)}
                            className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                          >
                            বিস্তারিত দেখুন
                          </Link>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </AdminResponsiveTable>

              <ul className="mt-4 space-y-3 md:hidden">
                {recentLeads.map((lead) => {
                  const summary = leadProblemSummaryShort({
                    problemCategory: lead.problemCategory,
                    problemDetails: lead.problemDetails,
                    serviceRequirement: lead.serviceRequirement,
                  });
                  return (
                  <li key={lead.id}>
                    <AdminCard className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <LeadPriorityBadge priority={lead.priority} className="mb-1" />
                        <p className="text-base font-semibold leading-snug text-zinc-900 break-words">
                          {lead.customerName}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          ডাঃ {lead.assignedDoctor?.name ?? "— (অ্যাসাইন নেই)"}
                        </p>
                      </div>
                      <LeadStatusBadge status={lead.status} />
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm text-zinc-700">
                      <div>
                        <dt className="text-xs font-medium text-zinc-500">এলাকা</dt>
                        <dd className="mt-0.5 break-words leading-relaxed">
                          {lead.selectedArea?.name ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-zinc-500">পশু</dt>
                        <dd className="mt-0.5 break-words leading-relaxed">
                          {formatLeadAnimalDisplay(lead.animalKind, lead.animalType)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium text-zinc-500">সমস্যা</dt>
                        <dd className="mt-0.5 break-words leading-relaxed">
                          {summary}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-zinc-500">সময়</dt>
                        <dd className="mt-0.5 text-zinc-600">
                          {formatDateTime(lead.createdAt)}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-4">
                      <Link
                        href={adminLeadDetailPath(lead.id)}
                        className="inline-flex min-h-[var(--q-touch-min)] w-full items-center justify-center rounded-2xl border-2 border-q-primary bg-q-primary-soft px-3 text-sm font-bold text-q-primary-deep touch-manipulation hover:bg-emerald-100"
                      >
                        বিস্তারিত দেখুন
                      </Link>
                    </div>
                    </AdminCard>
                  </li>
                  );
                })}
              </ul>
            </>
          )}
        </AdminPageSection>
      </AdminMain>
    </AdminAppShell>
  );
}
