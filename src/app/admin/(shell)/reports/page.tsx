import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { AdminResponsiveTable } from "@/components/admin/ui/AdminResponsiveTable";
import { LeadStatus, UserRole } from "@/generated/prisma/enums";
import { adminLeadDetailPath } from "@/lib/admin-routes";
import {
  collectAreaTextMatchFragments,
  doctorLeadActionableVisibilityWhereFromAreaIds,
} from "@/lib/doctor-lead-access";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function MiniPerfBars({
  completed,
  pending,
  cancelled,
}: {
  completed: number;
  pending: number;
  cancelled: number;
}) {
  const max = Math.max(1, completed + pending + cancelled);
  const h = (n: number) => `${Math.max(8, Math.round((n / max) * 100))}%`;
  return (
    <div className="mt-4 flex h-28 items-end justify-center gap-3 rounded-xl bg-zinc-50 px-2 py-2 ring-1 ring-zinc-200/80">
      <div className="flex w-8 flex-col items-center gap-1">
        <div
          className="w-full rounded-t-lg bg-emerald-700"
          style={{ height: h(completed) }}
          title={`সম্পন্ন: ${completed}`}
        />
        <span className="text-[10px] font-medium text-zinc-500">সম্পন্ন</span>
      </div>
      <div className="flex w-8 flex-col items-center gap-1">
        <div
          className="w-full rounded-t-lg bg-amber-500"
          style={{ height: h(pending) }}
          title={`চলমান: ${pending}`}
        />
        <span className="text-[10px] font-medium text-zinc-500">চলমান</span>
      </div>
      <div className="flex w-8 flex-col items-center gap-1">
        <div
          className="w-full rounded-t-lg bg-red-400"
          style={{ height: h(cancelled) }}
          title={`বাতিল: ${cancelled}`}
        />
        <span className="text-[10px] font-medium text-zinc-500">বাতিল</span>
      </div>
    </div>
  );
}

export default async function AdminDoctorReportsPage() {
  const doctors = await prisma.user.findMany({
    where: { role: UserRole.DOCTOR },
    select: {
      id: true,
      name: true,
      isActive: true,
      doctorAreas: {
        select: {
          areaId: true,
          area: { select: { name: true, nameBn: true, nameEn: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = await Promise.all(
    doctors.map(async (d) => {
      const aid = d.doctorAreas.map((x) => x.areaId);
      const fragments = collectAreaTextMatchFragments(
        d.doctorAreas.map((x) => x.area),
      );

      const visibilityWhere = doctorLeadActionableVisibilityWhereFromAreaIds(
        d.id,
        aid,
        fragments,
      );

      const [
        leadCount,
        observedCount,
        completedCount,
        cancelledCount,
        pendingCount,
        observationRecords,
        lastLead,
      ] = await Promise.all([
        prisma.lead.count({ where: visibilityWhere }),
        prisma.lead.count({
          where: { ...visibilityWhere, status: LeadStatus.OBSERVED },
        }),
        prisma.lead.count({
          where: { ...visibilityWhere, status: LeadStatus.COMPLETED },
        }),
        prisma.lead.count({
          where: { ...visibilityWhere, status: LeadStatus.CANCELLED },
        }),
        prisma.lead.count({
          where: {
            ...visibilityWhere,
            status: {
              in: [
                LeadStatus.NEW,
                LeadStatus.ASSIGNED,
                LeadStatus.ACCEPTED,
                LeadStatus.IN_PROGRESS,
                LeadStatus.OBSERVED,
              ],
            },
          },
        }),
        prisma.leadObservation.count({ where: { doctorId: d.id } }),
        prisma.lead.findFirst({
          where: visibilityWhere,
          orderBy: { updatedAt: "desc" },
          select: { id: true, updatedAt: true },
        }),
      ]);

      const areaLabels = d.doctorAreas
        .map((x) => x.area.nameBn ?? x.area.name)
        .join(", ");

      return {
        doctor: d,
        areaLabels: areaLabels || "—",
        leadCount,
        observedCount,
        completedCount,
        cancelledCount,
        pendingCount,
        observationRecords,
        lastActivity: lastLead?.updatedAt ?? null,
        sampleLeadId: lastLead?.id,
      };
    }),
  );

  return (
    <AdminAppShell>
      <AdminNav
        title="ডাক্তার রিপোর্ট"
        subtitle="এলাকা ও লিড অনুযায়ী কর্মক্ষমতা"
      />

      <AdminMain className="space-y-4">
        <AdminResponsiveTable className="hidden lg:block">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">ডাক্তার</th>
                <th className="px-4 py-3 font-medium">এলাকা</th>
                <th className="px-4 py-3 font-medium tabular-nums">মোট লিড</th>
                <th className="px-4 py-3 font-medium tabular-nums">
                  পর্যবেক্ষণ (স্ট্যাটাস)
                </th>
                <th className="px-4 py-3 font-medium tabular-nums">
                  ভিজিট রেকর্ড
                </th>
                <th className="px-4 py-3 font-medium tabular-nums">সম্পন্ন</th>
                <th className="px-4 py-3 font-medium tabular-nums">
                  চলমান/অপেক্ষমান
                </th>
                <th className="px-4 py-3 font-medium tabular-nums">বাতিল</th>
                <th className="px-4 py-3 font-medium">সর্বশেষ কার্যকলাপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r) => (
                <tr key={r.doctor.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/doctors/${r.doctor.id}/edit`}
                      className="font-medium text-emerald-800 hover:underline"
                    >
                      {r.doctor.name}
                    </Link>
                    {!r.doctor.isActive ? (
                      <span className="ml-2 text-xs text-zinc-400">(নিষ্ক্রিয়)</span>
                    ) : null}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-zinc-600" title={r.areaLabels}>
                    {r.areaLabels}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-800">{r.leadCount}</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-800">
                    {r.observedCount}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-800">
                    {r.observationRecords}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-800">
                    {r.completedCount}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-800">
                    {r.pendingCount}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-800">
                    {r.cancelledCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-600">
                    {r.lastActivity ? (
                      <span className="flex flex-col gap-0.5">
                        <span>{formatDateTime(r.lastActivity)}</span>
                        {r.sampleLeadId != null ? (
                          <Link
                            href={adminLeadDetailPath(r.sampleLeadId)}
                            className="font-medium text-emerald-700 hover:underline"
                          >
                            শেষ লিড #{r.sampleLeadId}
                          </Link>
                        ) : null}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminResponsiveTable>

        <ul className="space-y-3 lg:hidden">
          {rows.map((r) => (
            <li key={r.doctor.id}>
              <AdminCard>
              <Link
                href={`/admin/doctors/${r.doctor.id}/edit`}
                className="font-semibold text-emerald-800"
              >
                {r.doctor.name}
              </Link>
              <p className="mt-2 text-xs text-zinc-600">{r.areaLabels}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-700">
                <div>
                  <dt className="text-zinc-400">মোট লিড</dt>
                  <dd className="tabular-nums font-medium">{r.leadCount}</dd>
                </div>
                <div>
                  <dt className="text-zinc-400">সম্পন্ন</dt>
                  <dd className="tabular-nums font-medium">{r.completedCount}</dd>
                </div>
              </dl>
              <MiniPerfBars
                completed={r.completedCount}
                pending={r.pendingCount}
                cancelled={r.cancelledCount}
              />
              </AdminCard>
            </li>
          ))}
        </ul>
      </AdminMain>
    </AdminAppShell>
  );
}
