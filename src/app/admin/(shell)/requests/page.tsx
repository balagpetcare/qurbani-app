import Link from "next/link";

import { AdminLeadsFilterForm } from "@/components/admin/AdminLeadsFilterForm";
import { AdminNav } from "@/components/admin/AdminNav";
import { LeadPriorityBadge } from "@/components/admin/LeadPriorityBadge";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { AdminResponsiveTable } from "@/components/admin/ui/AdminResponsiveTable";
import { LeadPriority, UserRole } from "@/generated/prisma/enums";
import {
  LEAD_PRIORITY_LABEL_BN,
  LEAD_STATUS_LABEL_BN,
} from "@/lib/admin-labels";
import {
  ADMIN_REQUESTS_PATH,
  adminLeadDetailPath,
} from "@/lib/admin-routes";
import {
  adminLeadsQueryString,
  buildLeadWhere,
  hasActiveFilters,
  parseAdminLeadsSearchParams,
} from "@/lib/admin-leads-search";
import { leadCountPageSummaryBn } from "@/lib/bn-digits";
import { formatDateTime } from "@/lib/format";
import { formatLeadAnimalDisplay } from "@/lib/lead-display";
import { buildAdminLeadListRow } from "@/lib/lead-privacy";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminRequestsPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const parsed = parseAdminLeadsSearchParams(raw);
  const where = buildLeadWhere(parsed);

  const [doctors, totalCount, anyLeadExists] = await Promise.all([
    prisma.user.findMany({
      where: { role: UserRole.DOCTOR, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.lead.count({ where }),
    prisma.lead.findFirst({ select: { id: true } }),
  ]);

  const doctorNameById = new Map(doctors.map((d) => [d.id, d.name]));

  const totalPages =
    totalCount === 0 ? 1 : Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const effectivePage =
    totalCount === 0
      ? 1
      : Math.min(parsed.page, Math.max(1, totalPages));

  const skip = (effectivePage - 1) * PAGE_SIZE;

  const leadsRaw = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: PAGE_SIZE,
    select: {
      id: true,
      customerName: true,
      area: true,
      animalType: true,
      animalKind: true,
      animalCount: true,
      priority: true,
      problemCategory: true,
      problemDetails: true,
      serviceRequirement: true,
      status: true,
      createdAt: true,
      source: true,
      utmCampaign: true,
      assignedDoctorId: true,
      assignedDoctor: {
        select: { id: true, name: true },
      },
      selectedArea: { select: { id: true, name: true, slug: true } },
      isPossibleDuplicate: true,
      duplicateOfLeadId: true,
    },
  });

  const leads = leadsRaw.map((row) => buildAdminLeadListRow(row));

  const prevHref =
    effectivePage > 1
      ? `${ADMIN_REQUESTS_PATH}${adminLeadsQueryString(parsed, { page: effectivePage - 1 })}`
      : undefined;
  const nextHref =
    effectivePage < totalPages
      ? `${ADMIN_REQUESTS_PATH}${adminLeadsQueryString(parsed, { page: effectivePage + 1 })}`
      : undefined;

  const globalEmpty = !anyLeadExists;
  const filteredEmpty = totalCount === 0 && hasActiveFilters(parsed);

  return (
    <AdminAppShell>
      <AdminNav title="অনুরোধ ও লিড" />

      <AdminMain className="space-y-6">
        <AdminLeadsFilterForm
          doctors={doctors}
          parsed={parsed}
          listPath={ADMIN_REQUESTS_PATH}
        />

        {hasActiveFilters(parsed) && (
          <div className="rounded-2xl border border-emerald-100/90 bg-emerald-50/80 px-4 py-3 text-sm leading-relaxed text-zinc-800 shadow-[var(--q-card-shadow-sm)] sm:px-5">
            <span className="font-bold text-emerald-950">সক্রিয় ফিল্টার:</span>{" "}
            <span className="inline-flex flex-wrap gap-x-3 gap-y-1.5">
              {parsed.q && (
                <span>
                  খোঁজ: <strong className="font-semibold text-zinc-900">{parsed.q}</strong>
                </span>
              )}
              {parsed.status && (
                <span>
                  স্ট্যাটাস:{" "}
                  <strong className="font-semibold text-zinc-900">
                    {LEAD_STATUS_LABEL_BN[parsed.status]}
                  </strong>
                </span>
              )}
              {parsed.priority && (
                <span>
                  অগ্রাধিকার:{" "}
                  <strong className="font-semibold text-zinc-900">
                    {LEAD_PRIORITY_LABEL_BN[parsed.priority]}
                  </strong>
                </span>
              )}
              {parsed.problemCategory && (
                <span>
                  সমস্যা:{" "}
                  <strong className="font-semibold text-zinc-900">
                    {parsed.problemCategory}
                  </strong>
                </span>
              )}
              {parsed.area && (
                <span>
                  এলাকা: <strong className="font-semibold text-zinc-900">{parsed.area}</strong>
                </span>
              )}
              {parsed.animalType && (
                <span>
                  পশু:{" "}
                  <strong className="font-semibold text-zinc-900">{parsed.animalType}</strong>
                </span>
              )}
              {parsed.doctorId !== undefined && (
                <span>
                  ডাক্তার:{" "}
                  <strong className="font-semibold text-zinc-900">
                    {doctorNameById.get(parsed.doctorId) ?? `#${parsed.doctorId}`}
                  </strong>
                </span>
              )}
              {parsed.fromInput && (
                <span>
                  থেকে:{" "}
                  <strong className="font-semibold text-zinc-900">{parsed.fromInput}</strong>
                </span>
              )}
              {parsed.toInput && (
                <span>
                  পর্যন্ত:{" "}
                  <strong className="font-semibold text-zinc-900">{parsed.toInput}</strong>
                </span>
              )}
            </span>
            <span className="mt-2 block text-xs text-zinc-600">
              {leadCountPageSummaryBn(totalCount, effectivePage, totalPages)}
            </span>
          </div>
        )}

        {globalEmpty ? (
          <AdminEmptyState
            title="এখনও কোনো লিড নেই"
            description="ল্যান্ডিং পেজ থেকে ফর্ম জমা দিলে এখানে দেখা যাবে।"
            action={
              <Link
                href="/"
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                ল্যান্ডিং পেজে যান
              </Link>
            }
          />
        ) : filteredEmpty ? (
          <AdminEmptyState
            title="কোনো লিড মেলেনি"
            description="ফিল্টার পরিবর্তন করুন অথবা সব ফিল্টার সাফ করুন।"
            action={
              <Link
                href={ADMIN_REQUESTS_PATH}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-emerald-600 bg-q-primary-soft px-5 text-sm font-bold text-q-primary-deep hover:bg-emerald-100"
              >
                ফিল্টার মুছুন
              </Link>
            }
          />
        ) : (
          <>
            {!hasActiveFilters(parsed) && (
              <p className="text-sm leading-relaxed text-zinc-600">
                {leadCountPageSummaryBn(totalCount, effectivePage, totalPages)}
              </p>
            )}

            <AdminResponsiveTable className="hidden lg:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                  <tr>
                    <th className="px-3 py-3 pl-4 font-semibold lg:px-4">অগ্রাধিকার</th>
                    <th className="px-3 py-3 font-semibold lg:px-4">গ্রাহক</th>
                    <th className="px-3 py-3 font-semibold lg:px-4">ডাক্তার</th>
                    <th className="px-3 py-3 font-semibold lg:px-4">এলাকা</th>
                    <th className="px-3 py-3 font-semibold lg:px-4">পশু</th>
                    <th className="px-3 py-3 font-semibold lg:px-4">সমস্যা</th>
                    <th className="px-3 py-3 font-semibold lg:px-4">স্ট্যাটাস</th>
                    <th className="px-3 py-3 font-semibold lg:px-4">সময়</th>
                    <th className="px-3 py-3 pr-4 font-semibold lg:px-4">কর্ম</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={`hover:bg-zinc-50/80 ${
                        lead.priority === LeadPriority.EMERGENCY
                          ? "bg-red-50/60"
                          : lead.priority === LeadPriority.URGENT
                            ? "bg-amber-50/40"
                            : ""
                      }`}
                    >
                      <td className="px-3 py-3 pl-4 lg:px-4">
                        <LeadPriorityBadge priority={lead.priority} />
                      </td>
                      <td className="px-3 py-3 font-medium text-zinc-900 lg:px-4">
                        <div className="flex flex-col gap-1">
                          <span>{lead.customerName}</span>
                          <span className="inline-flex flex-wrap items-center gap-2 text-xs font-normal text-zinc-500">
                            {lead.isPossibleDuplicate && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-900 ring-1 ring-amber-600/25">
                                সম্ভাব্য ডুপ্লিকেট
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-zinc-700 lg:px-4">
                        {lead.assignedDoctor ? (
                          <span className="font-medium text-zinc-900">
                            {lead.assignedDoctor.name}
                          </span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-zinc-600 lg:px-4">
                        {lead.selectedArea?.name ?? lead.area ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-zinc-600 lg:px-4">
                        {formatLeadAnimalDisplay(lead.animalKind, lead.animalType)}
                      </td>
                      <td
                        className="max-w-[14rem] truncate px-3 py-3 text-zinc-600 lg:px-4"
                        title={lead.problemSummary}
                      >
                        {lead.problemSummary}
                      </td>
                      <td className="px-3 py-3 lg:px-4">
                        <LeadStatusBadge status={lead.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-zinc-500 lg:px-4">
                        {formatDateTime(lead.createdAt)}
                      </td>
                      <td className="px-3 py-3 pr-4 lg:px-4">
                        <Link
                          href={adminLeadDetailPath(lead.id)}
                          className="inline-flex min-h-[44px] items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                        >
                          বিস্তারিত / যোগাযোগ
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminResponsiveTable>

            <ul className="list-none space-y-3 lg:hidden">
              {leads.map((lead) => (
                <li key={lead.id}>
                  <AdminCard
                    className={`rounded-2xl p-3.5 shadow-[var(--q-card-shadow-sm)] sm:p-4 ${
                        lead.priority === LeadPriority.EMERGENCY
                          ? "border border-red-200/90 bg-red-50/40 ring-1 ring-red-100/80"
                          : lead.priority === LeadPriority.URGENT
                            ? "border border-amber-200/90 bg-amber-50/35 ring-1 ring-amber-100/70"
                            : "border border-zinc-100 ring-1 ring-black/[0.04]"
                      }`}
                  >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-bold leading-snug break-words text-zinc-900">
                        {lead.customerName}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <LeadPriorityBadge priority={lead.priority} />
                        {lead.isPossibleDuplicate ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-900 ring-1 ring-amber-600/25">
                            সম্ভাব্য ডুপ্লিকেট
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <LeadStatusBadge status={lead.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-zinc-100/90 pt-3 text-sm text-zinc-700">
                    <div className="col-span-2 min-w-0 sm:col-span-2">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">ডাক্তার</dt>
                      <dd className="mt-0.5 font-medium leading-snug break-words text-zinc-900">
                        {lead.assignedDoctor?.name ?? "—"}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">এলাকা</dt>
                      <dd className="mt-0.5 leading-snug break-words text-zinc-800">
                        {lead.selectedArea?.name ?? lead.area ?? "—"}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">পশু</dt>
                      <dd className="mt-0.5 leading-snug text-zinc-800">
                        {formatLeadAnimalDisplay(lead.animalKind, lead.animalType)}
                      </dd>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">সমস্যা</dt>
                      <dd className="mt-0.5 line-clamp-2 leading-relaxed break-words text-zinc-800">
                        {lead.problemSummary}
                      </dd>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">সময়</dt>
                      <dd className="mt-0.5 text-xs text-zinc-700">
                        {formatDateTime(lead.createdAt)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-3.5">
                    <Link
                      href={adminLeadDetailPath(lead.id)}
                      className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm touch-manipulation active:bg-emerald-700 sm:text-base"
                    >
                      বিস্তারিত / যোগাযোগ
                    </Link>
                  </div>
                  </AdminCard>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <nav
                className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 pt-6"
                aria-label="পৃষ্ঠা নির্বাচন"
              >
                <div className="text-sm leading-relaxed text-zinc-600">
                  {leadCountPageSummaryBn(totalCount, effectivePage, totalPages)}
                </div>
                <div className="flex min-w-0 flex-wrap gap-3">
                  {prevHref ? (
                    <Link
                      href={prevHref}
                      className="inline-flex min-h-[48px] items-center justify-center touch-manipulation rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                    >
                      পূর্ববর্তী
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-[48px] cursor-not-allowed items-center rounded-2xl border border-zinc-200 px-4 py-2 text-sm text-zinc-400">
                      পূর্ববর্তী
                    </span>
                  )}
                  {nextHref ? (
                    <Link
                      href={nextHref}
                      className="inline-flex min-h-[48px] items-center justify-center touch-manipulation rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                    >
                      পরবর্তী
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-[48px] cursor-not-allowed items-center rounded-2xl border border-zinc-200 px-4 py-2 text-sm text-zinc-400">
                      পরবর্তী
                    </span>
                  )}
                </div>
              </nav>
            )}
          </>
        )}
      </AdminMain>
    </AdminAppShell>
  );
}
