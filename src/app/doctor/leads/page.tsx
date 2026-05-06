import Link from "next/link";
import { redirect } from "next/navigation";

import { DoctorLeadQuickStatus } from "@/components/doctor/DoctorLeadQuickStatus";
import { DoctorLeadsFilters } from "@/components/doctor/DoctorLeadsFilters";
import { DoctorLeadsNav } from "@/components/doctor/DoctorLeadsNav";
import { LeadPriorityBadge } from "@/components/admin/LeadPriorityBadge";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { AppCard } from "@/components/ui/AppCard";
import { AppLeadCard } from "@/components/ui/AppLeadCard";
import { AppSection } from "@/components/ui/AppSection";
import { LeadPriority } from "@/generated/prisma/enums";
import { toBengaliDigits } from "@/lib/bn-digits";
import { formatDateTime } from "@/lib/format";
import { formatLeadAnimalDisplay } from "@/lib/lead-display";
import {
  buildDoctorLeadWhere,
  doctorLeadListOrderBy,
  mergeDoctorLeadAreaFilter,
  mergeDoctorLeadListFilters,
  parseDoctorLeadsAreaId,
  parseDoctorLeadsTab,
} from "@/lib/doctor-lead-access";
import { getLoggedInDoctor } from "@/lib/doctor-server-session";
import { buildDoctorLeadListRow } from "@/lib/lead-privacy";
import { formatPhoneForDisplay } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function oneParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function DoctorLeadsPage({ searchParams }: PageProps) {
  const doctor = await getLoggedInDoctor();
  if (!doctor) {
    redirect("/doctor/login?from=/doctor/leads");
  }

  const raw = await searchParams;
  const tab = parseDoctorLeadsTab(oneParam(raw.tab));
  let areaId = parseDoctorLeadsAreaId(oneParam(raw.area));
  const coveredIds = new Set(doctor.doctorAreas.map((d) => d.area.id));
  if (areaId != null && !coveredIds.has(areaId)) {
    areaId = undefined;
  }

  const base = await buildDoctorLeadWhere(doctor.id);
  const where = mergeDoctorLeadAreaFilter(
    mergeDoctorLeadListFilters(base, tab, doctor.id),
    areaId,
  );

  const restricted =
    oneParam(raw.restricted) === "1" || oneParam(raw.forbidden) === "1";

  const filterAreas = doctor.doctorAreas.map((d) => ({
    id: d.area.id,
    name: d.area.name,
  }));

  const leadsRaw = await prisma.lead.findMany({
    where,
    orderBy: doctorLeadListOrderBy,
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
      assignedDoctorId: true,
      createdAt: true,
      selectedArea: { select: { id: true, name: true, slug: true } },
      assignedDoctor: { select: { id: true, name: true } },
    },
  });

  const rows = leadsRaw.map((l) => buildDoctorLeadListRow(l, doctor.id));

  return (
    <DoctorLeadsNav
      title={`ডাঃ ${doctor.name}`}
      subtitle="লিড তালিকা · এলাকা ও অবস্থা অনুযায়ী"
      backHref="/doctor"
      backLabel="ড্যাশবোর্ড"
      backPreset="dashboard"
    >
      <div className="space-y-5 pb-1">
        {restricted ? (
          <AppCard variant="default" className="border-amber-200 bg-amber-50/60">
            <p className="text-sm font-semibold text-amber-950">
              এই লিডটি আপনার জন্য উন্মুক্ত নয়।
            </p>
            <p className="mt-1 text-sm text-amber-900/90">
              শুধু আপনার অ্যাসাইন বা আপনার সেবা এলাকার অনাসাইন ও প্রিভিউ লিড এখানে দেখা
              যাবে।
            </p>
          </AppCard>
        ) : null}

        <AppCard variant="flat" className="!p-3 sm:!p-5">
          <h2 className="text-[11px] font-bold uppercase tracking-wide text-q-muted">
            আপনার প্রোফাইল
          </h2>
          <dl className="mt-2.5 grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            <div>
              <dt className="text-xs font-medium text-q-muted">নাম</dt>
              <dd className="mt-0.5 font-semibold text-zinc-900">{doctor.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-q-muted">ফোন</dt>
              <dd className="mt-0.5 text-zinc-900">
                {doctor.phone ? formatPhoneForDisplay(doctor.phone) : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-q-muted">এলাকা</dt>
              <dd className="mt-0.5 text-zinc-900">
                {doctor.doctorAreas.length > 0
                  ? doctor.doctorAreas.map((d) => d.area.name).join(", ")
                  : doctor.areaCoverage ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-q-muted">এই ভিউতে লিড</dt>
              <dd className="mt-0.5 font-semibold tabular-nums text-q-primary-deep">
                {toBengaliDigits(rows.length)}
              </dd>
            </div>
          </dl>
        </AppCard>

        <AppSection title={`লিড (${toBengaliDigits(rows.length)})`}>
          <DoctorLeadsFilters tab={tab} areaId={areaId} areas={filterAreas} />

          {rows.length === 0 ? (
            <AppCard variant="inset" className="mt-3">
              <p className="text-center text-sm text-q-muted">
                এই তালিকায় এখন কোনো লিড নেই। অ্যাডমিন অ্যাসাইন করলে বা আপনার এলাকায় নতুন
                লিড এলে এখানে দেখা যাবে।
              </p>
            </AppCard>
          ) : (
            <>
              <AppCard variant="default" className="mt-3 hidden overflow-x-auto p-0 lg:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-100 bg-zinc-50/90 text-xs font-bold uppercase tracking-wide text-q-muted">
                    <tr>
                      <th className="px-4 py-3">অগ্রাধিকার</th>
                      <th className="px-4 py-3">গ্রাহক</th>
                      <th className="px-4 py-3">কেস</th>
                      <th className="px-4 py-3">এলাকা</th>
                      <th className="px-4 py-3">সমস্যা</th>
                      <th className="px-4 py-3">পশু</th>
                      <th className="px-4 py-3">সংখ্যা</th>
                      <th className="px-4 py-3">স্ট্যাটাস</th>
                      <th className="px-4 py-3">তৈরি</th>
                      <th className="px-4 py-3">দ্রুত</th>
                      <th className="px-4 py-3">লিঙ্ক</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((lead) => (
                      <tr
                        key={lead.id}
                        className={`border-b border-zinc-100 last:border-0 ${
                          lead.priority === LeadPriority.EMERGENCY
                            ? "bg-red-50/50"
                            : lead.priority === LeadPriority.URGENT
                              ? "bg-amber-50/40"
                              : ""
                        }`}
                      >
                        <td className="px-4 py-3 align-top">
                          <LeadPriorityBadge priority={lead.priority} />
                        </td>
                        <td className="px-4 py-3 font-medium text-zinc-900">
                          {lead.customerName}
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-600">
                          {lead.isMine ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-900">
                              আপনার কেস
                            </span>
                          ) : lead.assignedDoctor ? (
                            <span className="block max-w-[8rem] leading-snug">
                              ডাঃ {lead.assignedDoctor.name}
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-700">
                              পুল
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-700">
                          {lead.selectedArea?.name ?? lead.area ?? "—"}
                        </td>
                        <td
                          className="max-w-[14rem] truncate px-4 py-3 text-zinc-700"
                          title={lead.problemSummary}
                        >
                          {lead.problemSummary}
                        </td>
                        <td className="px-4 py-3 text-zinc-700">
                          {formatLeadAnimalDisplay(lead.animalKind, lead.animalType)}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-zinc-700">
                          {lead.animalCount ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <LeadStatusBadge status={lead.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                          {formatDateTime(lead.createdAt)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {!lead.isPeerLocked ? (
                            <DoctorLeadQuickStatus
                              leadId={lead.id}
                              status={lead.status}
                              assignedDoctorId={lead.assignedDoctorId}
                              viewerDoctorId={doctor.id}
                            />
                          ) : (
                            <span className="text-xs font-medium text-amber-800">লক</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/doctor/leads/${lead.id}`}
                            className="text-sm font-bold text-q-primary hover:underline"
                          >
                            দেখুন →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AppCard>

              <ul className="mt-3 list-none space-y-3 lg:hidden">
                {rows.map((lead) => {
                  const doctorLabel = lead.isMine
                    ? "আপনার কেস"
                    : lead.assignedDoctor
                      ? `ডাঃ ${lead.assignedDoctor.name}`
                      : "পুল";
                  return (
                    <li key={lead.id} className="min-w-0">
                      <AppLeadCard
                        id={lead.id}
                        customerName={lead.customerName}
                        status={lead.status}
                        priority={lead.priority}
                        problemSummary={lead.problemSummary}
                        doctorLabel={doctorLabel}
                        areaLabel={lead.selectedArea?.name ?? lead.area ?? undefined}
                        animalLabel={formatLeadAnimalDisplay(lead.animalKind, lead.animalType)}
                        createdAtLabel={formatDateTime(lead.createdAt)}
                        href={`/doctor/leads/${lead.id}`}
                        isPeerLocked={lead.isPeerLocked}
                        isMine={lead.isMine}
                        footer={
                          !lead.isPeerLocked ? (
                            <>
                              <p className="mb-2 text-xs font-semibold text-q-muted">
                                দ্রুত স্ট্যাটাস
                              </p>
                              <DoctorLeadQuickStatus
                                leadId={lead.id}
                                status={lead.status}
                                assignedDoctorId={lead.assignedDoctorId}
                                viewerDoctorId={doctor.id}
                              />
                            </>
                          ) : undefined
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </AppSection>
      </div>
    </DoctorLeadsNav>
  );
}
