import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { AdminResponsiveTable } from "@/components/admin/ui/AdminResponsiveTable";
import { TreatmentCompletionStatus } from "@/generated/prisma/enums";
import {
  fetchAdminDoctorFinanceDetail,
  parseAdminDoctorFinanceParams,
  serializeAdminDoctorFinanceQuery,
} from "@/lib/admin-doctor-finance";
import {
  ADMIN_DOCTOR_FINANCE_PATH,
  adminDoctorFinanceDetailPath,
  adminLeadDetailPath,
} from "@/lib/admin-routes";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ doctorId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatTk(n: number): string {
  return `${n.toLocaleString("en-US")} ৳`;
}

const CLOSURE_BN: Record<TreatmentCompletionStatus, string> = {
  COMPLETED: "সম্পন্ন",
  FOLLOW_UP_NEEDED: "ফলোআপ",
  REFERRED: "রেফার",
  CANCELLED: "বাতিল",
};

export default async function AdminDoctorFinanceDetailPage({ params, searchParams }: PageProps) {
  const { doctorId: rawId } = await params;
  const doctorUserId = parseInt(rawId, 10);
  if (Number.isNaN(doctorUserId)) notFound();

  const raw = await searchParams;
  const parsed = parseAdminDoctorFinanceParams(raw);

  const data = await fetchAdminDoctorFinanceDetail(doctorUserId, parsed);
  if (!data) notFound();

  const { doctor, totals, cases, meta } = data;

  const listQs = serializeAdminDoctorFinanceQuery({
    ...parsed,
    doctorId: undefined,
    page: 1,
  });

  const caseQs = (page: number) =>
    serializeAdminDoctorFinanceQuery({
      ...parsed,
      doctorId: undefined,
      page,
    });

  const emptyCases = totals.completedCaseCount === 0;

  return (
    <AdminAppShell>
      <AdminNav
        title={`ফিন্যান্স · ${doctor.name}`}
        subtitle={doctor.isActive ? "সক্রিয় ডাক্তার" : "নিষ্ক্রিয় ডাক্তার"}
        narrow
      />

      <AdminMain variant="narrow" className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Link
            href={listQs ? `${ADMIN_DOCTOR_FINANCE_PATH}?${listQs}` : ADMIN_DOCTOR_FINANCE_PATH}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 touch-manipulation hover:bg-zinc-50"
          >
            ← ডাক্তার তালিকায় ফিরুন
          </Link>
          <Link
            href={`/admin/doctors/${doctor.id}/edit`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white touch-manipulation hover:bg-emerald-800"
          >
            প্রোফাইল সম্পাদনা
          </Link>
        </div>

        <AdminCard className="p-4">
          <h2 className="text-sm font-bold text-zinc-900">ডাক্তার প্রোফাইল</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-zinc-500">নাম</dt>
              <dd className="font-semibold text-zinc-900">{doctor.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">ফোন</dt>
              <dd className="text-zinc-800">{doctor.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">ইমেইল</dt>
              <dd className="break-all text-zinc-800">{doctor.email ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-500">এলাকা কভারেজ</dt>
              <dd className="text-zinc-800">{doctor.areaCoverageLabel}</dd>
            </div>
          </dl>
        </AdminCard>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminCard className="p-4">
            <p className="text-[11px] font-semibold uppercase text-zinc-500">কেস সংখ্যা</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{totals.completedCaseCount}</p>
          </AdminCard>
          <AdminCard className="p-4">
            <p className="text-[11px] font-semibold uppercase text-zinc-500">হোম ভিজিট (লিড)</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{totals.homeVisitCount}</p>
          </AdminCard>
          <AdminCard className="p-4 sm:col-span-2">
            <p className="text-[11px] font-semibold uppercase text-zinc-500">
              মোট গৃহীত (কাস্টমার)
            </p>
            <p className="mt-2 text-xl font-bold tabular-nums text-emerald-900">
              {formatTk(totals.totalCollectedFromCustomer)}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              কমিশন ভিত্তি (এই ফিল্টারে): {formatTk(totals.percentageBaseAmount)}
            </p>
          </AdminCard>
          <AdminCard className="p-4">
            <p className="text-[11px] font-semibold uppercase text-zinc-500">মেডিসিন খরচ</p>
            <p className="mt-2 text-lg font-bold tabular-nums">{formatTk(totals.totalMedicineCost)}</p>
          </AdminCard>
          <AdminCard className="p-4">
            <p className="text-[11px] font-semibold uppercase text-zinc-500">যাতায়াত খরচ</p>
            <p className="mt-2 text-lg font-bold tabular-nums">{formatTk(totals.totalTravelCost)}</p>
          </AdminCard>
          <AdminCard className="p-4">
            <p className="text-[11px] font-semibold uppercase text-zinc-500">ডাক্তার আয়</p>
            <p className="mt-2 text-lg font-bold tabular-nums text-emerald-900">
              {formatTk(totals.doctorEarnedAmount)}
            </p>
          </AdminCard>
          <AdminCard className="p-4">
            <p className="text-[11px] font-semibold uppercase text-zinc-500">কোম্পানি কমিশন</p>
            <p className="mt-2 text-lg font-bold tabular-nums text-amber-900">
              {formatTk(totals.adminCompanyAmount)}
            </p>
          </AdminCard>
        </section>

        <AdminCard className="p-4">
          <h2 className="text-sm font-bold text-zinc-900">কেস অনুযায়ী বিল</h2>
          <p className="mt-1 text-xs text-zinc-600">
            শুধু এই ডাক্তারের বিল। ভিত্তি = গ্রাহক থেকে গৃহীত টাকা (মেডিসিন/যাতায়াত বাদ দিয়ে নয়)।
          </p>

          {emptyCases ? (
            <div className="mt-6">
              <AdminEmptyState title="এই সময়ের মধ্যে কোনো কমপ্লিটেড কেস পাওয়া যায়নি।" />
            </div>
          ) : (
            <>
              <AdminResponsiveTable className="mt-4 hidden lg:block">
                <table className="w-full min-w-[1024px] text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600">
                    <tr>
                      <th className="px-3 py-3 font-medium">সমাপ্তি</th>
                      <th className="px-3 py-3 font-medium">গ্রাহক</th>
                      <th className="px-3 py-3 font-medium">ফোন</th>
                      <th className="px-3 py-3 font-medium">এলাকা</th>
                      <th className="px-3 py-3 font-medium">লিড</th>
                      <th className="px-3 py-3 font-medium">ধরন</th>
                      <th className="px-3 py-3 font-medium tabular-nums">গৃহীত</th>
                      <th className="px-3 py-3 font-medium tabular-nums">মেডিসিন</th>
                      <th className="px-3 py-3 font-medium tabular-nums">যাতায়াত</th>
                      <th className="px-3 py-3 font-medium tabular-nums">ভিত্তি</th>
                      <th className="px-3 py-3 font-medium tabular-nums">ডাক্তার</th>
                      <th className="px-3 py-3 font-medium tabular-nums">কোম্পানি</th>
                      <th className="px-3 py-3 font-medium">লিঙ্ক</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {cases.map((c) => (
                      <tr key={c.billingId} className="hover:bg-zinc-50/80">
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-zinc-700">
                          {formatDateTime(new Date(c.completedAt))}
                        </td>
                        <td className="max-w-[120px] truncate px-3 py-3 font-medium text-zinc-900">
                          {c.customerName}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs">{c.customerPhone}</td>
                        <td className="max-w-[100px] truncate px-3 py-3 text-xs text-zinc-600">
                          {c.areaLabel}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs font-semibold">#{c.leadId}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs">
                          {CLOSURE_BN[c.treatmentClosureStatus] ?? c.treatmentClosureStatus}
                        </td>
                        <td className="px-3 py-3 tabular-nums font-medium text-emerald-900">
                          {formatTk(c.totalCollectedFromCustomer)}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-zinc-700">
                          {formatTk(c.medicineCost)}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-zinc-700">
                          {formatTk(c.travelCost)}
                        </td>
                        <td className="px-3 py-3 tabular-nums">{formatTk(c.percentageBaseAmount)}</td>
                        <td className="px-3 py-3 tabular-nums font-semibold text-emerald-900">
                          {formatTk(c.doctorEarnedAmount)}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-amber-900">
                          {formatTk(c.adminCompanyAmount)}
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={adminLeadDetailPath(c.leadId)}
                            className="font-semibold text-emerald-800 hover:underline"
                          >
                            লিড
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminResponsiveTable>

              <ul className="mt-4 space-y-3 lg:hidden">
                {cases.map((c) => (
                  <li key={c.billingId}>
                    <AdminCard className="p-4">
                      <p className="text-xs text-zinc-500">{formatDateTime(new Date(c.completedAt))}</p>
                      <p className="mt-1 font-bold text-zinc-900">{c.customerName}</p>
                      <p className="text-xs text-zinc-600">{c.customerPhone}</p>
                      <p className="mt-2 text-xs text-zinc-600">{c.areaLabel}</p>
                      <p className="mt-2 font-mono text-sm font-semibold">
                        লিড #{c.leadId} · {CLOSURE_BN[c.treatmentClosureStatus]}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="col-span-2">
                          <dt className="text-zinc-400">গৃহীত</dt>
                          <dd className="tabular-nums font-semibold text-emerald-900">
                            {formatTk(c.totalCollectedFromCustomer)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-zinc-400">ডাক্তার আয়</dt>
                          <dd className="tabular-nums font-semibold">{formatTk(c.doctorEarnedAmount)}</dd>
                        </div>
                        <div>
                          <dt className="text-zinc-400">কোম্পানি</dt>
                          <dd className="tabular-nums">{formatTk(c.adminCompanyAmount)}</dd>
                        </div>
                      </dl>
                      <Link
                        href={adminLeadDetailPath(c.leadId)}
                        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-emerald-700 py-2 text-sm font-semibold text-white touch-manipulation hover:bg-emerald-800"
                      >
                        লিড বিস্তারিত
                      </Link>
                    </AdminCard>
                  </li>
                ))}
              </ul>

              {meta.totalPages > 1 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4 text-sm">
                  <p className="text-zinc-600">
                    কেস পৃষ্ঠা {meta.page} / {meta.totalPages} · মোট {meta.totalCases}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {meta.page > 1 ? (
                      <Link
                        href={`${adminDoctorFinanceDetailPath(doctorUserId)}?${caseQs(meta.page - 1)}`}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold touch-manipulation hover:bg-zinc-50"
                      >
                        আগের পৃষ্ঠা
                      </Link>
                    ) : null}
                    {meta.page < meta.totalPages ? (
                      <Link
                        href={`${adminDoctorFinanceDetailPath(doctorUserId)}?${caseQs(meta.page + 1)}`}
                        className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold touch-manipulation hover:bg-zinc-50"
                      >
                        পরের পৃষ্ঠা
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </AdminCard>
      </AdminMain>
    </AdminAppShell>
  );
}
