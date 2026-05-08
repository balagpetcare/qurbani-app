import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { AdminResponsiveTable } from "@/components/admin/ui/AdminResponsiveTable";
import { UserRole } from "@/generated/prisma/enums";
import {
  fetchAdminDoctorFinanceList,
  parseAdminDoctorFinanceParams,
  serializeAdminDoctorFinanceQuery,
  type AdminDoctorFinanceQuery,
} from "@/lib/admin-doctor-finance";
import {
  adminDoctorFinanceDetailPath,
  ADMIN_DOCTOR_FINANCE_PATH,
} from "@/lib/admin-routes";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatTk(n: number): string {
  return `${n.toLocaleString("en-US")} ৳`;
}

function queryWith(
  base: AdminDoctorFinanceQuery,
  patch: Partial<AdminDoctorFinanceQuery>,
): string {
  return serializeAdminDoctorFinanceQuery({ ...base, ...patch });
}

export default async function AdminDoctorFinancePage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const parsed = parseAdminDoctorFinanceParams(raw);

  const [result, doctors, areas] = await Promise.all([
    fetchAdminDoctorFinanceList(parsed),
    prisma.user.findMany({
      where: { role: UserRole.DOCTOR },
      orderBy: { name: "asc" },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.area.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nameBn: true },
    }),
  ]);

  const { rows, grandTotals, meta } = result;
  const empty =
    grandTotals.completedCaseCount === 0 && rows.length === 0;

  const detailQs = serializeAdminDoctorFinanceQuery({ ...parsed, page: 1 });

  return (
    <AdminAppShell>
      <AdminNav
        title="ডাক্তার ফিন্যান্স"
        subtitle="সমাপ্ত বিল ও আর্থিক সারাংশ (ডাক্তার অনুযায়ী)"
      />

      <AdminMain className="space-y-5">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <AdminCard className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              মোট কমপ্লিটেড কেস
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900">
              {grandTotals.completedCaseCount.toLocaleString("en-US")}
            </p>
          </AdminCard>
          <AdminCard className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              মোট কালেকশন
            </p>
            <p className="mt-2 text-xl font-bold tabular-nums text-emerald-900">
              {formatTk(grandTotals.totalCollectedFromCustomer)}
            </p>
          </AdminCard>
          <AdminCard className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              মোট মেডিসিন খরচ
            </p>
            <p className="mt-2 text-xl font-bold tabular-nums text-zinc-800">
              {formatTk(grandTotals.totalMedicineCost)}
            </p>
          </AdminCard>
          <AdminCard className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              মোট যাতায়াত খরচ
            </p>
            <p className="mt-2 text-xl font-bold tabular-nums text-zinc-800">
              {formatTk(grandTotals.totalTravelCost)}
            </p>
          </AdminCard>
          <AdminCard className="p-4 sm:col-span-2 lg:col-span-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              মোট ডাক্তার আয় (রেকর্ড)
            </p>
            <p className="mt-2 text-xl font-bold tabular-nums text-emerald-900">
              {formatTk(grandTotals.doctorEarnedAmount)}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              কোম্পানি কমিশন (রেকর্ড): {formatTk(grandTotals.adminCompanyAmount)}
            </p>
          </AdminCard>
        </section>

        <AdminCard className="p-4">
          <h2 className="text-sm font-bold text-zinc-900">ফিল্টার</h2>
          <p className="mt-1 text-xs text-zinc-600">
            ডিফল্ট: শুধু <strong>সম্পন্ন</strong> সমাপ্তি। তারিখ খালি থাকলে সব সময়কাল।
          </p>
          <form method="get" className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs font-medium text-zinc-700">
              তারিখ থেকে
              <input
                type="date"
                name="from"
                defaultValue={parsed.from ? parsed.from.toISOString().slice(0, 10) : ""}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-700">
              তারিখ পর্যন্ত
              <input
                type="date"
                name="to"
                defaultValue={parsed.to ? parsed.to.toISOString().slice(0, 10) : ""}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-700">
              ডাক্তার
              <select
                name="doctorId"
                defaultValue={parsed.doctorId != null ? String(parsed.doctorId) : ""}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              >
                <option value="">সব ডাক্তার</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {!d.isActive ? " (নিষ্ক্রিয়)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-700">
              এলাকা (লিড)
              <select
                name="areaId"
                defaultValue={parsed.areaId != null ? String(parsed.areaId) : ""}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              >
                <option value="">সব এলাকা</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nameBn ?? a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-700 sm:col-span-2">
              ডাক্তার খোঁজা (নাম বা ফোন)
              <input
                type="search"
                name="search"
                defaultValue={parsed.search}
                placeholder="উদা. রহিম বা ০১৭…"
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-700">
              সমাপ্তির ধরন
              <select
                name="closure"
                defaultValue={parsed.closure === "all_closures" ? "all" : "completed"}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              >
                <option value="completed">শুধু সম্পন্ন (কমপ্লিটেড)</option>
                <option value="all">সব সমাপ্তি ধরন</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-zinc-700">
              প্রতি পৃষ্ঠায়
              <select
                name="limit"
                defaultValue={String(parsed.limit)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              >
                {[15, 30, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white touch-manipulation hover:bg-emerald-800"
              >
                ফিল্টার প্রয়োগ
              </button>
              <Link
                href={ADMIN_DOCTOR_FINANCE_PATH}
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-800 touch-manipulation hover:bg-zinc-50"
              >
                রিসেট
              </Link>
            </div>
          </form>
        </AdminCard>

        {empty ? (
          <AdminEmptyState
            title="এই সময়ের মধ্যে কোনো কমপ্লিটেড কেস পাওয়া যায়নি।"
            description="তারিখ বা ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন। “সব সমাপ্তি ধরন” বেছে নিলে ফলোআপ/বাতিলসহ অন্যান্য সমাপ্তিও দেখতে পারেন।"
          />
        ) : (
          <>
            <AdminResponsiveTable className="hidden xl:block">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600">
                  <tr>
                    <th className="px-3 py-3 font-medium">ডাক্তার</th>
                    <th className="px-3 py-3 font-medium">ফোন</th>
                    <th className="px-3 py-3 font-medium">এলাকা</th>
                    <th className="px-3 py-3 font-medium tabular-nums">কেস</th>
                    <th className="px-3 py-3 font-medium tabular-nums">হোম ভিজিট</th>
                    <th className="px-3 py-3 font-medium tabular-nums">গৃহীত</th>
                    <th className="px-3 py-3 font-medium tabular-nums">মেডিসিন</th>
                    <th className="px-3 py-3 font-medium tabular-nums">যাতায়াত</th>
                    <th className="px-3 py-3 font-medium tabular-nums">ভিত্তি</th>
                    <th className="px-3 py-3 font-medium tabular-nums">ডাক্তার আয়</th>
                    <th className="px-3 py-3 font-medium tabular-nums">কোম্পানি</th>
                    <th className="px-3 py-3 font-medium">কর্ম</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((r) => (
                    <tr key={r.doctorId} className="hover:bg-zinc-50/80">
                      <td className="px-3 py-3 font-medium text-zinc-900">{r.doctorName}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-zinc-700">
                        {r.doctorPhone ?? "—"}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-3 text-xs text-zinc-600" title={r.areaCoverageLabel}>
                        {r.areaCoverageLabel}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{r.completedCaseCount}</td>
                      <td className="px-3 py-3 tabular-nums">{r.homeVisitCount}</td>
                      <td className="px-3 py-3 tabular-nums font-medium text-emerald-900">
                        {formatTk(r.totalCollectedFromCustomer)}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-zinc-700">
                        {formatTk(r.totalMedicineCost)}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-zinc-700">
                        {formatTk(r.totalTravelCost)}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-zinc-800">
                        {formatTk(r.percentageBaseAmount)}
                      </td>
                      <td className="px-3 py-3 tabular-nums font-semibold text-emerald-900">
                        {formatTk(r.doctorEarnedAmount)}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-amber-900">
                        {formatTk(r.adminCompanyAmount)}
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`${adminDoctorFinanceDetailPath(r.doctorId)}?${detailQs}`}
                          className="font-semibold text-emerald-800 hover:underline"
                        >
                          বিস্তারিত
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminResponsiveTable>

            <ul className="space-y-3 xl:hidden">
              {rows.map((r) => (
                <li key={r.doctorId}>
                  <AdminCard className="p-4">
                    <p className="font-bold text-zinc-900">{r.doctorName}</p>
                    <p className="mt-1 text-xs text-zinc-600">{r.doctorPhone ?? "—"}</p>
                    <p className="mt-2 text-xs text-zinc-600">{r.areaCoverageLabel}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-zinc-400">কেস</dt>
                        <dd className="tabular-nums font-medium">{r.completedCaseCount}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-400">হোম ভিজিট</dt>
                        <dd className="tabular-nums font-medium">{r.homeVisitCount}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-zinc-400">গৃহীত</dt>
                        <dd className="tabular-nums font-semibold text-emerald-900">
                          {formatTk(r.totalCollectedFromCustomer)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-zinc-400">ডাক্তার আয়</dt>
                        <dd className="tabular-nums font-semibold">{formatTk(r.doctorEarnedAmount)}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-400">কোম্পানি</dt>
                        <dd className="tabular-nums">{formatTk(r.adminCompanyAmount)}</dd>
                      </div>
                    </dl>
                    <Link
                      href={`${adminDoctorFinanceDetailPath(r.doctorId)}?${detailQs}`}
                      className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white touch-manipulation hover:bg-emerald-800"
                    >
                      বিস্তারিত
                    </Link>
                  </AdminCard>
                </li>
              ))}
            </ul>

            {meta.totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4 text-sm">
                <p className="text-zinc-600">
                  পৃষ্ঠা {meta.page} / {meta.totalPages} · মোট ডাক্তার {meta.totalDoctorRows}
                </p>
                <div className="flex flex-wrap gap-2">
                  {meta.page > 1 ? (
                    <Link
                      href={`${ADMIN_DOCTOR_FINANCE_PATH}?${queryWith(parsed, { page: meta.page - 1 })}`}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold text-zinc-800 touch-manipulation hover:bg-zinc-50"
                    >
                      আগের পৃষ্ঠা
                    </Link>
                  ) : null}
                  {meta.page < meta.totalPages ? (
                    <Link
                      href={`${ADMIN_DOCTOR_FINANCE_PATH}?${queryWith(parsed, { page: meta.page + 1 })}`}
                      className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-semibold text-zinc-800 touch-manipulation hover:bg-zinc-50"
                    >
                      পরের পৃষ্ঠা
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </AdminMain>
    </AdminAppShell>
  );
}
