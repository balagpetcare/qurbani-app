import { notFound, redirect } from "next/navigation";

import { LeadPriorityBadge } from "@/components/admin/LeadPriorityBadge";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { DoctorLeadMediaStrip } from "@/components/doctor/DoctorLeadMediaStrip";
import { DoctorLeadWorkflowPanel } from "@/components/doctor/DoctorLeadWorkflowPanel";
import { DoctorLeadsNav } from "@/components/doctor/DoctorLeadsNav";
import { DoctorObservationForm } from "@/components/doctor/DoctorObservationForm";
import { LeadStatusTimeline } from "@/components/doctor/LeadStatusTimeline";
import { AppCard } from "@/components/ui/AppCard";
import { AppLockedState } from "@/components/ui/AppLockedState";
import { formatDateTime } from "@/lib/format";
import {
  formatLeadAnimalDisplay,
  formatLeadProblemCategory,
} from "@/lib/lead-display";
import { parseMediaUrlList } from "@/lib/lead-workflow";
import { doctorCanAccessLead } from "@/lib/doctor-lead-access";
import { canDoctorViewLeadCustomerContact, leadProblemSummaryShort } from "@/lib/lead-privacy";
import { getLoggedInDoctor } from "@/lib/doctor-server-session";
import {
  bangladeshTelHref,
  formatPhoneForDisplay,
  phoneToWhatsAppNumber,
} from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { getBillingPlatformCommissionRatePercent } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function DoctorLeadDetailPage({ params }: PageProps) {
  const doctor = await getLoggedInDoctor();
  if (!doctor) {
    redirect("/doctor/login");
  }

  const { id: raw } = await params;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) notFound();

  const can = await doctorCanAccessLead(doctor.id, id);
  if (!can) {
    redirect("/doctor/leads?restricted=1");
  }

  const [lead, platformCommissionRatePercent] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
      selectedArea: true,
      caseReport: true,
      caseBilling: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      observations: {
        orderBy: { visitedAt: "desc" },
        include: {
          doctor: { select: { id: true, name: true } },
        },
      },
      notes: { orderBy: { createdAt: "desc" }, take: 40 },
    },
    }),
    getBillingPlatformCommissionRatePercent(),
  ]);

  if (!lead) notFound();

  const contactVisible = canDoctorViewLeadCustomerContact(doctor.id, lead);
  const claimedByOther =
    lead.assignedDoctorId != null && lead.assignedDoctorId !== doctor.id;

  const waDigits = contactVisible
    ? phoneToWhatsAppNumber(lead.whatsapp?.trim() || lead.phone)
    : null;
  const waHref = waDigits ? `https://wa.me/${waDigits}` : null;
  const telHref = contactVisible ? bangladeshTelHref(lead.phone) : "#";
  const mediaUrls = contactVisible ? parseMediaUrlList(lead.mediaUrls) : [];

  const summaryLine = leadProblemSummaryShort({
    problemCategory: lead.problemCategory,
    problemDetails: lead.problemDetails,
    serviceRequirement: lead.serviceRequirement,
  });

  const initialCase = lead.caseReport
    ? {
        observation: lead.caseReport.observation,
        doctorAdvice: lead.caseReport.doctorAdvice,
        diagnosis: lead.caseReport.diagnosis,
        treatmentGiven: lead.caseReport.treatmentGiven,
        medicineAdvice: lead.caseReport.medicineAdvice,
        followUpNeeded: lead.caseReport.followUpNeeded,
        nextFollowUpAt: lead.caseReport.nextFollowUpAt?.toISOString() ?? null,
        publicShowcaseEligible: lead.caseReport.publicShowcaseEligible,
        showcaseTitle: lead.caseReport.showcaseTitle,
        showcaseSummary: lead.caseReport.showcaseSummary,
        completedAt: lead.caseReport.completedAt?.toISOString() ?? null,
      }
    : null;

  const initialBilling = lead.caseBilling
    ? {
        invoiceNo: lead.caseBilling.invoiceNo,
        completedAt: lead.caseBilling.completedAt.toISOString(),
        status: lead.caseBilling.status,
        observation: lead.caseBilling.observation,
        diagnosis: lead.caseBilling.diagnosis,
        treatmentNote: lead.caseBilling.treatmentNote,
        medicinesUsed: lead.caseBilling.medicinesUsed,
        serviceFee: lead.caseBilling.serviceFee,
        medicineCharge: lead.caseBilling.medicineCharge,
        transportCharge: lead.caseBilling.transportCharge,
        emergencyCharge: lead.caseBilling.emergencyCharge,
        otherCharge: lead.caseBilling.otherCharge,
        discountAmount: lead.caseBilling.discountAmount,
        grossAmount: lead.caseBilling.grossAmount,
        totalCollected: lead.caseBilling.totalCollected,
        dueAmount: lead.caseBilling.dueAmount,
        paymentMethod: lead.caseBilling.paymentMethod,
        commissionableAmount: lead.caseBilling.commissionableAmount,
        platformCommissionRate: lead.caseBilling.platformCommissionRate,
        platformCommissionAmount: lead.caseBilling.platformCommissionAmount,
        doctorEarningAmount: lead.caseBilling.doctorEarningAmount,
        doctorPayableToPlatform: lead.caseBilling.doctorPayableToPlatform,
        settlementStatus: lead.caseBilling.settlementStatus,
        followUpRequired: lead.caseBilling.followUpRequired,
        followUpAt: lead.caseBilling.followUpAt?.toISOString() ?? null,
      }
    : null;

  const observationsForUi = contactVisible ? lead.observations : [];
  const notesForUi = contactVisible ? lead.notes : [];

  return (
    <DoctorLeadsNav
      title={`লিড #${lead.id}`}
      subtitle={`ডাঃ ${doctor.name}`}
      backHref="/doctor/leads"
      backLabel="লিড তালিকা"
      backPreset="leads"
    >
      <div className="space-y-5">
        {claimedByOther ? (
          <AppLockedState
            title="অন্য ডাক্তারের কেস"
            message="এই কেসটি অন্য একজন ডাক্তার গ্রহণ করেছেন। গ্রাহকের ফোন, WhatsApp বা ঠিকানা দেখানো হবে না। প্রয়োজনে অ্যাডমিনের সাথে যোগাযোগ করুন।"
          />
        ) : null}

        {!contactVisible && !claimedByOther ? (
          <AppCard variant="flat" className="border-sky-200 bg-sky-50/80">
            <p className="text-sm font-bold text-sky-950">যোগাযোগের তথ্য লুকানো আছে</p>
            <p className="mt-2 text-sm leading-relaxed text-sky-900/90">
              নিচের <strong>এই কেসটি আমি নিচ্ছি</strong> বাটনে কেস গ্রহণ করলে ফোন, WhatsApp ও
              ঠিকানা দেখতে পারবেন।
            </p>
          </AppCard>
        ) : null}

        {contactVisible ? (
          <div className="flex min-w-0 flex-col gap-3 sm:grid sm:grid-cols-2">
            <a
              href={telHref}
              className={`inline-flex min-h-[52px] items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white touch-manipulation active:bg-emerald-700 sm:min-h-[48px] sm:text-sm ${
                waHref ? "" : "sm:col-span-1"
              }`}
            >
              কল করুন
            </a>
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[52px] items-center justify-center rounded-xl border-2 border-emerald-600 bg-white px-4 py-3 text-base font-semibold text-emerald-900 touch-manipulation active:bg-emerald-50 sm:min-h-[48px] sm:text-sm"
              >
                WhatsApp করুন
              </a>
            ) : null}
            {lead.googleMapUrl?.trim() ? (
              <a
                href={lead.googleMapUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 text-base font-semibold text-sky-900 touch-manipulation active:bg-sky-100 sm:col-span-2 sm:min-h-[48px] sm:w-auto sm:text-sm"
              >
                গুগল মানচিত্র
              </a>
            ) : null}
          </div>
        ) : null}

        <AppCard variant="default">
          <h2 className="text-xs font-bold uppercase tracking-wide text-q-muted">গ্রাহক</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-zinc-500">নাম</dt>
              <dd className="font-medium text-zinc-900">{lead.customerName}</dd>
            </div>
            {contactVisible ? (
              <>
                <div>
                  <dt className="text-xs text-zinc-500">ফোন</dt>
                  <dd className="text-zinc-900">{formatPhoneForDisplay(lead.phone)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">WhatsApp</dt>
                  <dd className="text-zinc-900">
                    {lead.whatsapp ? formatPhoneForDisplay(lead.whatsapp) : "—"}
                  </dd>
                </div>
              </>
            ) : null}
            <div>
              <dt className="text-xs text-zinc-500">এলাকা</dt>
              <dd className="text-zinc-900">
                {lead.selectedArea?.nameBn ?? lead.selectedArea?.name ?? lead.area ?? "—"}
              </dd>
            </div>
            {contactVisible && lead.address ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">ঠিকানা</dt>
                <dd className="whitespace-pre-wrap text-zinc-900">{lead.address}</dd>
              </div>
            ) : null}
          </dl>
        </AppCard>

        {contactVisible && mediaUrls.length > 0 ? (
          <DoctorLeadMediaStrip urls={mediaUrls} />
        ) : null}

        <AppCard variant="default">
          <h2 className="text-xs font-bold uppercase tracking-wide text-q-muted">অনুরোধ</h2>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
            অগ্রাধিকার: <LeadPriorityBadge priority={lead.priority} />
          </p>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">পশু</dt>
              <dd className="text-zinc-900">
                {formatLeadAnimalDisplay(lead.animalKind, lead.animalType)}
                {lead.animalCount != null ? ` × ${lead.animalCount}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">সমস্যার ধরন</dt>
              <dd className="text-zinc-900">
                {formatLeadProblemCategory(lead.problemCategory)}
              </dd>
            </div>
            {!contactVisible ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">সারাংশ</dt>
              <dd className="whitespace-pre-wrap break-words text-zinc-900">{summaryLine}</dd>
              </div>
            ) : null}
            {contactVisible && lead.problemDetails ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">বিস্তারিত</dt>
                <dd className="break-words whitespace-pre-wrap text-zinc-900">{lead.problemDetails}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-zinc-500">পছন্দের সময়</dt>
              <dd className="text-zinc-900">{lead.preferredTime ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">সেবা / চিকিৎসা</dt>
              <dd className="whitespace-pre-wrap break-words text-zinc-900">
                {contactVisible
                  ? lead.serviceRequirement
                  : `${lead.serviceRequirement.slice(0, 160)}${lead.serviceRequirement.length > 160 ? "…" : ""}`}
              </dd>
            </div>
            {contactVisible && lead.message ? (
              <div>
                <dt className="text-xs text-zinc-500">গ্রাহকের নোট</dt>
                <dd className="whitespace-pre-wrap text-zinc-900">{lead.message}</dd>
              </div>
            ) : null}
          </dl>
        </AppCard>

        {!claimedByOther ? (
          <AppCard variant="default">
            <h2 className="text-xs font-bold uppercase tracking-wide text-q-muted">
              ওয়ার্কফ্লো, চিকিৎসা ও বিলিং
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
              বর্তমান: <LeadStatusBadge status={lead.status} />
            </p>
            <div className="mt-4 border-t border-zinc-100 pt-4">
              <DoctorLeadWorkflowPanel
                key={`${lead.status}-${lead.caseReport?.updatedAt?.toISOString() ?? "none"}-${lead.caseBilling?.updatedAt?.toISOString() ?? "nb"}`}
                leadId={lead.id}
                doctorId={doctor.id}
                leadStatus={lead.status}
                assignedDoctorId={lead.assignedDoctorId}
                initialCase={initialCase}
                initialBilling={initialBilling}
                platformCommissionRatePercent={platformCommissionRatePercent}
              />
            </div>
            <div className="mt-5 border-t border-zinc-100 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-q-muted">
                টাইমলাইন
              </h3>
              <div className="mt-3">
                <LeadStatusTimeline entries={lead.statusHistory} />
              </div>
            </div>
          </AppCard>
        ) : null}

        {contactVisible ? (
          <AppCard variant="default">
            <h2 className="text-xs font-bold uppercase tracking-wide text-q-muted">
              নতুন পর্যবেক্ষণ
            </h2>
            <div className="mt-4">
              <DoctorObservationForm leadId={lead.id} />
            </div>
          </AppCard>
        ) : null}

        {contactVisible ? (
          <AppCard variant="default">
            <h2 className="text-xs font-bold uppercase tracking-wide text-q-muted">
              পর্যবেক্ষণ ইতিহাস
            </h2>
            {observationsForUi.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-600">এখনও কোনো রেকর্ড নেই।</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {observationsForUi.map((o) => (
                  <li
                    key={o.id}
                    className="rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-sm"
                  >
                    <p className="font-medium text-zinc-900">
                      ডাঃ {o.doctor.name}{" "}
                      <span className="font-normal text-zinc-500">
                        · {formatDateTime(o.visitedAt)}
                      </span>
                    </p>
                    {o.condition ? (
                      <p className="mt-2 text-zinc-800">
                        <span className="text-xs text-zinc-500">অবস্থা: </span>
                        {o.condition}
                      </p>
                    ) : null}
                    {o.note ? (
                      <p className="mt-2 whitespace-pre-wrap text-zinc-900">{o.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </AppCard>
        ) : null}

        <AppCard variant="default">
          <h2 className="text-xs font-bold uppercase tracking-wide text-q-muted">
            অভ্যন্তরীণ নোট (টিম)
          </h2>
          <p className="mt-1 text-xs text-q-muted">
            {contactVisible
              ? "অ্যাডমিন বা সিস্টেম থেকে যোগ করা নোট — শুধু পড়া।"
              : "কেস গ্রহণের পর দেখানো হবে।"}
          </p>
          {!contactVisible ? (
            <p className="mt-4 text-sm text-zinc-600">কেস গ্রহণ করলে নোট এখানে দেখা যাবে।</p>
          ) : notesForUi.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">কোনো নোট নেই।</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {notesForUi.map((n) => (
                <li
                  key={n.id}
                  className="rounded-2xl border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-sm"
                >
                  <p className="whitespace-pre-wrap text-zinc-900">{n.note}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {formatDateTime(n.createdAt)}
                    {n.createdBy ? ` · ${n.createdBy}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AppCard>
      </div>
    </DoctorLeadsNav>
  );
}
