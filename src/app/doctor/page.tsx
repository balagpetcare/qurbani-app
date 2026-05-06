import Link from "next/link";

import { DoctorLeadsNav } from "@/components/doctor/DoctorLeadsNav";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { AppCard } from "@/components/ui/AppCard";
import { AppSection } from "@/components/ui/AppSection";
import { AppStatCard } from "@/components/ui/AppStatCard";
import { LeadPriority, LeadStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/format";
import {
  buildDoctorActionableLeadWhere,
  doctorLeadListOrderBy,
} from "@/lib/doctor-lead-access";
import { getLoggedInDoctor } from "@/lib/doctor-server-session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DoctorDashboardPage() {
  const doctor = await getLoggedInDoctor();
  if (!doctor) {
    redirect("/doctor/login?from=/doctor");
  }

  const actionable = await buildDoctorActionableLeadWhere(doctor.id);

  const emergencyActiveWhere = {
    ...actionable,
    priority: LeadPriority.EMERGENCY,
    status: {
      notIn: [
        LeadStatus.COMPLETED,
        LeadStatus.FOLLOW_UP_NEEDED,
        LeadStatus.CANCELLED,
        LeadStatus.REFERRED,
      ],
    },
  };

  const [
    leadCount,
    completedCount,
    cancelledCount,
    pendingCount,
    observationCount,
    emergencyActiveCount,
    recentLeads,
    emergencyLeads,
  ] = await Promise.all([
    prisma.lead.count({ where: actionable }),
    prisma.lead.count({
      where: {
        ...actionable,
        status: { in: [LeadStatus.COMPLETED, LeadStatus.FOLLOW_UP_NEEDED] },
      },
    }),
    prisma.lead.count({
      where: { ...actionable, status: LeadStatus.CANCELLED },
    }),
    prisma.lead.count({
      where: {
        ...actionable,
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
    prisma.leadObservation.count({
      where: { doctorId: doctor.id },
    }),
    prisma.lead.count({ where: emergencyActiveWhere }),
    prisma.lead.findMany({
      where: actionable,
      orderBy: [...doctorLeadListOrderBy, { id: "desc" }],
      take: 8,
      select: {
        id: true,
        customerName: true,
        status: true,
        updatedAt: true,
        priority: true,
      },
    }),
    prisma.lead.findMany({
      where: emergencyActiveWhere,
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        customerName: true,
        status: true,
        updatedAt: true,
      },
    }),
  ]);

  return (
    <DoctorLeadsNav
      title={`ডাঃ ${doctor.name}`}
      subtitle="ড্যাশবোর্ড · কুরবানি ২০২৬"
    >
      <div className="space-y-8">
        <section className="grid gap-3 sm:grid-cols-2">
          <AppStatCard label="সংশ্লিষ্ট লিড" value={leadCount} />
          <AppStatCard label="চলমান / অপেক্ষমান" value={pendingCount} />
          <AppStatCard
            label="সক্রিয় জরুরি"
            value={emergencyActiveCount}
            accent={emergencyActiveCount > 0 ? "danger" : "default"}
            hint={emergencyActiveCount > 0 ? "অগ্রাধিকার দিন" : undefined}
          />
          <AppStatCard label="সম্পন্ন" value={completedCount} />
          <AppStatCard label="বাতিল" value={cancelledCount} />
          <AppStatCard label="পর্যবেক্ষণ রেকর্ড" value={observationCount} />
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href="/doctor/leads"
            className="inline-flex min-h-[var(--q-touch-min)] w-full items-center justify-center rounded-2xl bg-q-primary px-5 text-[15px] font-semibold text-white shadow-md shadow-emerald-900/15 touch-manipulation hover:bg-q-primary-deep sm:flex-1 sm:max-w-xs"
          >
            সব লিড দেখুন
          </Link>
        </div>

        {emergencyLeads.length > 0 ? (
          <AppSection title="জরুরি লিড" description="অগ্রাধিকার দিন">
            <AppCard variant="default" className="border-2 border-red-200 bg-red-50/50">
              <ul className="divide-y divide-red-100 rounded-2xl border border-red-100 bg-white">
                {emergencyLeads.map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-zinc-900">{l.customerName}</p>
                      <p className="mt-1 text-xs text-q-muted">
                        আপডেট: {formatDateTime(l.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <LeadStatusBadge status={l.status} />
                      <Link
                        href={`/doctor/leads/${l.id}`}
                        className="inline-flex min-h-[var(--q-touch-min)] min-w-[7rem] items-center justify-center rounded-2xl bg-red-600 px-3 text-sm font-bold text-white touch-manipulation hover:bg-red-700"
                      >
                        বিস্তারিত →
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-red-900/90">
                <Link
                  href="/doctor/leads?tab=emergency"
                  className="font-semibold text-red-900 underline touch-manipulation"
                >
                  সব জরুরি লিড তালিকায় দেখুন
                </Link>
              </p>
            </AppCard>
          </AppSection>
        ) : null}

        <AppSection
          title="সাম্প্রতিক লিড"
          description="নতুনের আগে — আপনার এলাকা ও অ্যাসাইনমেন্ট অনুযায়ী"
        >
          {recentLeads.length === 0 ? (
            <AppCard variant="inset">
              <p className="text-center text-sm text-q-muted">
                এখনও কোনো সংশ্লিষ্ট লিড নেই।
              </p>
            </AppCard>
          ) : (
            <ul className="space-y-3">
              {recentLeads.map((l) => (
                <li key={l.id}>
                  <AppCard
                    variant="default"
                    className={
                      l.priority === LeadPriority.EMERGENCY
                        ? "border-red-200 ring-1 ring-red-100"
                        : l.priority === LeadPriority.URGENT
                          ? "border-amber-200 ring-1 ring-amber-50"
                          : ""
                    }
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-zinc-900">{l.customerName}</p>
                        <p className="text-xs text-q-muted">
                          আপডেট: {formatDateTime(l.updatedAt)}
                        </p>
                      </div>
                      <Link
                        href={`/doctor/leads/${l.id}`}
                        className="inline-flex min-h-[var(--q-touch-min)] min-w-[6.5rem] items-center justify-center rounded-2xl border-2 border-q-primary bg-q-primary-soft px-3 text-sm font-bold text-q-primary-deep touch-manipulation hover:bg-emerald-100"
                      >
                        বিস্তারিত →
                      </Link>
                    </div>
                  </AppCard>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-q-muted">
            সর্বশেষ আপডেট (শীর্ষ লিড):{" "}
            {recentLeads.length > 0
              ? formatDateTime(recentLeads[0].updatedAt)
              : "—"}
          </p>
        </AppSection>
      </div>
    </DoctorLeadsNav>
  );
}
