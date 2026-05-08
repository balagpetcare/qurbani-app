import Link from "next/link";
import { redirect } from "next/navigation";

import { DoctorLeadsNav } from "@/components/doctor/DoctorLeadsNav";
import { AppCard } from "@/components/ui/AppCard";
import { AppSection } from "@/components/ui/AppSection";
import { AppStatCard } from "@/components/ui/AppStatCard";
import { TreatmentCompletionStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/format";
import { buildDoctorFinanceSummary } from "@/lib/doctor-finance-summary";
import { getLoggedInDoctor } from "@/lib/doctor-server-session";
import { getBillingPlatformCommissionRatePercent } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

function formatTk(n: number): string {
  return `${n.toLocaleString("en-US")} ৳`;
}

const STATUS_BN: Record<TreatmentCompletionStatus, string> = {
  COMPLETED: "সম্পন্ন",
  FOLLOW_UP_NEEDED: "ফলোআপ",
  REFERRED: "রেফার",
  CANCELLED: "বাতিল",
};

export default async function DoctorFinancePage() {
  const doctor = await getLoggedInDoctor();
  if (!doctor) {
    redirect("/doctor/login?from=/doctor/finance");
  }

  const rate = await getBillingPlatformCommissionRatePercent();
  const summary = await buildDoctorFinanceSummary(doctor.id, rate);

  return (
    <DoctorLeadsNav
      title="ফিন্যান্স"
      subtitle={`ডাঃ ${doctor.name} · কুরবানি ২০২৬`}
      backHref="/doctor"
      backLabel="ড্যাশবোর্ড"
      backPreset="dashboard"
    >
      <div className="space-y-8">
        <AppCard variant="flat" className="border-emerald-100 bg-emerald-50/50 p-4 text-sm leading-relaxed text-emerald-950">
          <p>
            নিচের সংখ্যাগুলো আপনার <strong>সমাপ্ত বিলযুক্ত কেস</strong> থেকে জমা হয়েছে। কমিশন
            ভিত্তি হলো <strong>কাস্টমার থেকে গৃহীত টাকা</strong>। মেডিসিন ও যাতায়াত খরচ শুধু
            রেকর্ড — প্ল্যাটফর্ম কমিশন এগুলো থেকে কাটে না।
          </p>
          {summary.platformCommissionRatePercentHint != null ? (
            <p className="mt-2 text-xs text-emerald-900/85">
              বর্তমান প্ল্যাটফর্ম কমিশন হার (সেটিংস):{" "}
              <strong>{summary.platformCommissionRatePercentHint}%</strong> — প্রতিটি নতুন বিলে
              স্ন্যাপশট সংরক্ষিত হয়।
            </p>
          ) : null}
        </AppCard>

        <section className="grid gap-3 sm:grid-cols-2">
          <AppStatCard
            label="সমাপ্ত কেস / বিল"
            value={summary.completedCaseCount}
            hint="ইনভয়েস জমা হওয়া সমাপ্তি"
          />
          <AppStatCard
            label="ভিজিট পছন্দ / হোম কল (লিড)"
            value={summary.homeVisitOrCompletedVisitCount}
            hint="গ্রাহক ‘ভিজিট’ পছন্দ করেছিল এমন বিল"
          />
          <AppStatCard
            label="মোট গৃহীত (কাস্টমার)"
            value={formatTk(summary.totalCollectedFromCustomer)}
          />
          <AppStatCard label="মোট মেডিসিন খরচ" value={formatTk(summary.totalMedicineCost)} />
          <AppStatCard label="মোট যাতায়াত খরচ" value={formatTk(summary.totalTravelCost)} />
          <AppStatCard
            label="কমিশন ভিত্তির যোগফল"
            value={formatTk(summary.percentageBaseAmount)}
            hint="ইতিহাসভিত্তিক (পুরনো বিলে ভিন্ন নীতি থাকতে পারে)"
          />
          <AppStatCard
            label="মোট ডাক্তার আয় (রেকর্ডকৃত)"
            value={formatTk(summary.totalDoctorEarnedAmount)}
          />
        </section>

        <AppSection
          title="সাম্প্রতিক সমাপ্ত কেস"
          description="শুধু আপনার বিল — সর্বোচ্চ ২৫ টি"
        >
          {summary.recentCases.length === 0 ? (
            <AppCard variant="inset">
              <p className="text-center text-sm text-q-muted">
                এখনও কোনো সমাপ্ত বিল নেই। লিড সমাপ্ত করলে এখানে দেখা যাবে।
              </p>
            </AppCard>
          ) : (
            <AppCard variant="default" className="overflow-x-auto p-0">
              <table className="min-w-[640px] w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/90 text-xs font-bold uppercase tracking-wide text-q-muted">
                    <th className="px-4 py-3">তারিখ</th>
                    <th className="px-4 py-3">ইনভয়েস</th>
                    <th className="px-4 py-3">গ্রাহক</th>
                    <th className="px-4 py-3">অবস্থা</th>
                    <th className="px-4 py-3 text-right">গৃহীত</th>
                    <th className="px-4 py-3 text-right">মেডিসিন</th>
                    <th className="px-4 py-3 text-right">যাতায়াত</th>
                    <th className="px-4 py-3 text-center">ভিজিট</th>
                    <th className="px-4 py-3 text-right">ডাক্তার আয়</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {summary.recentCases.map((row) => (
                    <tr key={`${row.invoiceNo}-${row.completedAt}`} className="bg-white">
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-700">
                        {formatDateTime(new Date(row.completedAt))}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-zinc-800">
                        <Link
                          href={`/doctor/leads/${row.leadId}`}
                          className="text-q-primary-deep underline-offset-2 hover:underline"
                        >
                          {row.invoiceNo}
                        </Link>
                      </td>
                      <td className="max-w-[140px] truncate px-4 py-3 text-zinc-900">
                        {row.customerName}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-700">
                        {STATUS_BN[row.status as TreatmentCompletionStatus] ?? row.status}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                        {formatTk(row.totalCollectedFromCustomer)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-600">
                        {formatTk(row.medicineCost)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-600">
                        {formatTk(row.travelCost)}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-medium">
                        {row.isHomeVisitPreference ? "হ্যাঁ" : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold text-emerald-900">
                        {formatTk(row.doctorEarnedAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AppCard>
          )}
        </AppSection>
      </div>
    </DoctorLeadsNav>
  );
}
