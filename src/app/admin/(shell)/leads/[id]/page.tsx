import Link from "next/link";
import { notFound } from "next/navigation";

import { AssignDoctorForm } from "@/components/admin/AssignDoctorForm";
import { AdminNav } from "@/components/admin/AdminNav";
import { LeadNoteForm } from "@/components/admin/LeadNoteForm";
import { LeadPriorityBadge } from "@/components/admin/LeadPriorityBadge";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { LeadStatusForm } from "@/components/admin/LeadStatusForm";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminDetailSection } from "@/components/admin/ui/AdminDetailSection";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { LeadStatusTimeline } from "@/components/doctor/LeadStatusTimeline";
import { UserRole } from "@/generated/prisma/enums";
import { ADMIN_REQUESTS_PATH, adminLeadDetailPath } from "@/lib/admin-routes";
import { formatDateOnly, formatDateTime } from "@/lib/format";
import {
  formatLeadAnimalDisplay,
  formatLeadProblemCategory,
} from "@/lib/lead-display";
import {
  bangladeshTelHref,
  formatPhoneForDisplay,
  phoneToWhatsAppNumber,
} from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function buildDoctorHandoffMessage(lead: {
  id: number;
  customerName: string;
  phone: string;
  area: string | null;
  selectedArea?: { name: string } | null;
  animalType: string | null;
  animalKind: import("@/generated/prisma/enums").AnimalKind | null;
  animalCount: number | null;
  priority: import("@/generated/prisma/enums").LeadPriority;
  problemCategory: string | null;
  problemDetails: string | null;
  message: string | null;
  serviceRequirement: string;
}): string {
  const areaLabel = lead.selectedArea?.name ?? lead.area ?? "—";
  const animal = formatLeadAnimalDisplay(lead.animalKind, lead.animalType);
  const prob = formatLeadProblemCategory(lead.problemCategory);
  return [
    `Qurbani lead #${lead.id}`,
    `Priority: ${lead.priority}`,
    `Customer: ${lead.customerName}`,
    `Customer phone: ${lead.phone}`,
    `Area: ${areaLabel}`,
    `Animal: ${animal}`,
    `Animal count: ${lead.animalCount ?? "—"}`,
    `Problem category: ${prob}`,
    `Problem details: ${lead.problemDetails ?? "—"}`,
    `Service / requirement: ${lead.serviceRequirement}`,
    `Extra note: ${lead.message ?? "—"}`,
    `Lead ID: ${lead.id}`,
  ].join("\n");
}

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminLeadDetailPage({ params }: PageProps) {
  const { id: raw } = await params;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) notFound();

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      assignedDoctor: {
        select: {
          id: true,
          name: true,
          phone: true,
          whatsapp: true,
          email: true,
          role: true,
        },
      },
      selectedArea: true,
      observations: {
        orderBy: { visitedAt: "desc" },
        include: {
          doctor: { select: { id: true, name: true } },
        },
      },
      notes: {
        orderBy: { createdAt: "desc" },
      },
      caseReport: true,
      statusHistory: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!lead) notFound();

  const activeAssignment =
    lead.assignedDoctorId != null
      ? await prisma.leadAssignment.findFirst({
          where: {
            leadId: lead.id,
            doctorId: lead.assignedDoctorId,
            unassignedAt: null,
          },
          orderBy: { assignedAt: "desc" },
          select: { assignedAt: true },
        })
      : null;

  const activeDoctors = await prisma.user.findMany({
    where: { role: UserRole.DOCTOR, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  let doctorOptions = activeDoctors.map((d) => ({ id: d.id, name: d.name }));
  if (
    lead.assignedDoctorId != null &&
    !doctorOptions.some((d) => d.id === lead.assignedDoctorId)
  ) {
    const extra = await prisma.user.findUnique({
      where: { id: lead.assignedDoctorId },
      select: { id: true, name: true },
    });
    if (extra) {
      doctorOptions = [
        { id: extra.id, name: `${extra.name} (বর্তমান অ্যাসাইন)` },
        ...doctorOptions,
      ];
    }
  }

  const contactPhone = lead.phone;
  const customerWaDigits = phoneToWhatsAppNumber(
    lead.whatsapp?.trim() || lead.phone,
  );
  const telHref = bangladeshTelHref(contactPhone);
  const customerWaHref = customerWaDigits
    ? `https://wa.me/${customerWaDigits}`
    : null;

  const doctorContactRaw =
    lead.assignedDoctor?.whatsapp?.trim() ||
    lead.assignedDoctor?.phone ||
    "";
  const doctorWaDigits = doctorContactRaw
    ? phoneToWhatsAppNumber(doctorContactRaw)
    : null;
  const doctorWaHref = doctorWaDigits
    ? `https://wa.me/${doctorWaDigits}?text=${encodeURIComponent(buildDoctorHandoffMessage(lead))}`
    : null;

  return (
    <AdminAppShell>
      <AdminNav
        narrow
        title="লিড বিবরণ"
        subtitle={`লিড #${lead.id} · বিস্তারিত`}
      />

      <AdminMain variant="narrow" className="space-y-5 pb-1 pt-2 sm:pt-3">
        <div className="space-y-5">
          {(lead.isPossibleDuplicate || lead.duplicateOfLeadId != null) && (
            <div
              className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 shadow-[var(--q-card-shadow-sm)]"
              role="status"
            >
              <p className="font-semibold">সম্ভাব্য ডুপ্লিকেট জমা</p>
              <p className="mt-1 text-amber-900/90">
                গত ২৪ ঘণ্টায় একই নর্মালাইজড ফোনে অন্য একটি জমা আছে।
              </p>
              {lead.duplicateOfLeadId != null && (
                <p className="mt-3">
                  <Link
                    href={adminLeadDetailPath(lead.duplicateOfLeadId)}
                    className="font-medium text-amber-950 underline decoration-amber-600/40 underline-offset-2 hover:decoration-amber-800"
                  >
                    মূল লিড #{lead.duplicateOfLeadId} দেখুন
                  </Link>
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <LeadPriorityBadge priority={lead.priority} />
            <span className="text-xs text-zinc-500">লিড #{lead.id}</span>
          </div>

          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
            <a
              href={telHref}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white touch-manipulation hover:bg-emerald-700 sm:w-auto sm:min-h-[48px] sm:rounded-xl sm:py-2.5 sm:text-base"
            >
              কল করুন
            </a>
            {customerWaHref ? (
              <a
                href={customerWaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border-2 border-emerald-600 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 touch-manipulation hover:bg-emerald-50 sm:w-auto sm:min-h-[48px] sm:rounded-xl sm:py-2.5 sm:text-base"
              >
                গ্রাহক ওয়াটসঅ্যাপ
              </a>
            ) : (
              <span className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500 sm:w-auto sm:rounded-xl sm:text-base">
                গ্রাহক ওয়াটসঅ্যাপ (অবৈধ নম্বর)
              </span>
            )}
            <Link
              href={ADMIN_REQUESTS_PATH}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 touch-manipulation sm:w-auto"
            >
              তালিকায় ফিরুন
            </Link>
          </div>

          <AdminDetailSection title="গ্রাহক">
            <dl className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div>
                <dt className="text-xs text-zinc-500">নাম</dt>
                <dd className="font-medium text-zinc-900">{lead.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">ফোন</dt>
                <dd className="text-zinc-900">{formatPhoneForDisplay(lead.phone)}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">ওয়াটসঅ্যাপ</dt>
                <dd className="text-zinc-900">
                  {lead.whatsapp
                    ? formatPhoneForDisplay(lead.whatsapp)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">এলাকা (নির্বাচিত)</dt>
                <dd className="text-zinc-900">
                  {lead.selectedArea?.name ?? lead.area ?? "—"}
                </dd>
              </div>
              {lead.address ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-zinc-500">ঠিকানা</dt>
                  <dd className="break-words whitespace-pre-wrap text-zinc-900">{lead.address}</dd>
                </div>
              ) : null}
            </dl>
          </AdminDetailSection>

          <AdminDetailSection title="পশু ও অনুরোধ">
            <dl className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div>
                <dt className="text-xs text-zinc-500">পশুর ধরন</dt>
                <dd className="text-zinc-900">
                  {formatLeadAnimalDisplay(lead.animalKind, lead.animalType)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">সংখ্যা</dt>
                <dd className="text-zinc-900">
                  {lead.animalCount != null ? lead.animalCount : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">আনুমানিক বয়স</dt>
                <dd className="text-zinc-900">{lead.approxAgeText ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">আনুমানিক ওজন (কেজি)</dt>
                <dd className="text-zinc-900">
                  {lead.approxWeightKg != null ? lead.approxWeightKg : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">সমস্যার ধরন</dt>
                <dd className="text-zinc-900">
                  {formatLeadProblemCategory(lead.problemCategory)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">সমস্যার সময়কাল</dt>
                <dd className="text-zinc-900">{lead.problemDuration ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">খাওয়ার অবস্থা</dt>
                <dd className="text-zinc-900">{lead.eatingStatus ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">জ্বর সন্দেহ</dt>
                <dd className="text-zinc-900">
                  {lead.feverSuspected == null ? "—" : lead.feverSuspected ? "হ্যাঁ" : "না"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">পেট ফাঁপা</dt>
                <dd className="text-zinc-900">
                  {lead.bellyBloated == null ? "—" : lead.bellyBloated ? "হ্যাঁ" : "না"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">হাঁটতে পারে</dt>
                <dd className="text-zinc-900">
                  {lead.canWalk == null ? "—" : lead.canWalk ? "হ্যাঁ" : "না"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">পছন্দের যোগাযোগ</dt>
                <dd className="text-zinc-900">{lead.preferredContact ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">মানচিত্র লিংক</dt>
                <dd className="break-all text-zinc-900">
                  {lead.googleMapUrl ? (
                    <a
                      href={lead.googleMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-800 underline"
                    >
                      {lead.googleMapUrl}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">মিডিয়া URL (JSON)</dt>
                <dd className="whitespace-pre-wrap break-all font-mono text-xs text-zinc-800">
                  {lead.mediaUrls ?? "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">পছন্দের তারিখ</dt>
                <dd className="text-zinc-900">
                  {lead.preferredDate ? formatDateOnly(lead.preferredDate) : "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">পছন্দের সময়</dt>
                <dd className="text-zinc-900">{lead.preferredTime ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">সেবা / চিকিৎসা প্রয়োজন</dt>
                <dd className="break-words whitespace-pre-wrap text-zinc-900">
                  {lead.serviceRequirement}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">সমস্যার বিস্তারিত</dt>
                <dd className="break-words whitespace-pre-wrap text-zinc-900">
                  {lead.problemDetails ?? "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-zinc-500">অতিরিক্ত বার্তা</dt>
                <dd className="break-words whitespace-pre-wrap text-zinc-900">
                  {lead.message ?? "—"}
                </dd>
              </div>
            </dl>
          </AdminDetailSection>

          <AdminDetailSection
            title="সোর্স ও ক্যাম্পেইন"
            subtitle="মার্কেটিং/ল্যান্ডিং থেকে আসা ট্র্যাকিং ক্ষেত্র (প্রযোজ্য হলে)।"
          >
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-zinc-500">ট্র্যাফিক উৎস</dt>
                <dd className="break-all text-zinc-900">{lead.source ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">ল্যান্ডিং পাথ</dt>
                <dd className="break-all font-mono text-xs text-zinc-800">
                  {lead.landingPath ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">UTM উৎস</dt>
                <dd className="break-all text-zinc-900">{lead.utmSource ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">UTM মাধ্যম</dt>
                <dd className="break-all text-zinc-900">{lead.utmMedium ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">UTM ক্যাম্পেইন</dt>
                <dd className="break-all text-zinc-900">{lead.utmCampaign ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">UTM বিষয়বস্তু</dt>
                <dd className="break-all text-zinc-900">{lead.utmContent ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">UTM টার্ম</dt>
                <dd className="break-all text-zinc-900">{lead.utmTerm ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-500">UTM এলাকা</dt>
                <dd className="break-all text-zinc-900">{lead.utmArea ?? "—"}</dd>
              </div>
            </dl>
          </AdminDetailSection>

          <AdminDetailSection
            title="ডাক্তার অ্যাসাইন"
            subtitle="রিলিজ করতে ডাক্তার নির্বাচন ফাঁকা রেখে সংরক্ষণ করুন — লিড আবার পুলে চলে যাবে (নতুন / উপযুক্ত স্ট্যাটাস)।"
          >
            <div className="mt-4 border-b border-zinc-100 pb-6">
              <AssignDoctorForm
                key={`assign-${lead.assignedDoctorId ?? "none"}`}
                leadId={lead.id}
                assignedDoctorId={lead.assignedDoctorId}
                doctors={doctorOptions}
              />
            </div>

            {lead.assignedDoctor ? (
              <div className="mt-6 rounded-xl bg-zinc-50 px-4 py-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  নির্ধারিত ডাক্তার
                </h3>
                <p className="mt-2 font-medium text-zinc-900">
                  {lead.assignedDoctor.name}
                  <span className="ml-2 text-sm font-normal text-zinc-500">
                    ({lead.assignedDoctor.role})
                  </span>
                </p>
                {activeAssignment ? (
                  <p className="mt-2 text-xs text-zinc-600">
                    গ্রহণ / অ্যাসাইন সময়:{" "}
                    <span className="font-medium text-zinc-800">
                      {formatDateTime(activeAssignment.assignedAt)}
                    </span>
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {lead.assignedDoctor.phone && (
                    <a
                      href={bangladeshTelHref(lead.assignedDoctor.phone)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
                    >
                      ডাক্তার ফোন
                    </a>
                  )}
                  {doctorWaHref ? (
                    <a
                      href={doctorWaHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      ডাক্তার ওয়াটসঅ্যাপ (লিড সারাংশ)
                    </a>
                  ) : (
                    <span className="text-xs text-zinc-500">
                      ডাক্তারের ফোন বা ওয়াটসঅ্যাপ নেই — বার্তা খুলতে পারবেন না।
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-600">
                এখনও কোনো ডাক্তার অ্যাসাইন করা হয়নি।
              </p>
            )}
          </AdminDetailSection>

          <AdminDetailSection
            title="স্ট্যাটাস ও সময়"
            subtitle="বর্তমান স্ট্যাটাস পরিবর্তন ও সময়ের রেকর্ড।"
          >
            <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
              বর্তমান স্ট্যাটাস: <LeadStatusBadge status={lead.status} />
            </p>
            <div className="mt-4 border-t border-zinc-100 pt-4">
              <LeadStatusForm
                key={lead.status}
                leadId={lead.id}
                currentStatus={lead.status}
              />
            </div>
            <dl className="mt-6 grid gap-2 text-sm text-zinc-600">
              <div className="flex justify-between gap-4">
                <dt>তৈরি</dt>
                <dd className="text-right text-zinc-900">
                  {formatDateTime(lead.createdAt)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>সর্বশেষ আপডেট</dt>
                <dd className="text-right text-zinc-900">
                  {formatDateTime(lead.updatedAt)}
                </dd>
              </div>
            </dl>
            <div className="mt-6 border-t border-zinc-100 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                স্ট্যাটাস টাইমলাইন
              </h3>
              <div className="mt-3">
                <LeadStatusTimeline entries={lead.statusHistory} />
              </div>
            </div>
          </AdminDetailSection>

          {lead.caseReport ? (
            <AdminDetailSection
              title="সমাপনী রিপোর্ট (ডাক্তার)"
              subtitle="ডাক্তার দ্বারা জমা দেওয়া কেস রিপোর্ট।"
            >
              {lead.caseReport.completedAt ? (
                <p className="mt-2 text-xs text-zinc-500">
                  সম্পন্ন: {formatDateTime(lead.caseReport.completedAt)}
                  {lead.caseReport.completedByDoctorId != null
                    ? ` · ডাক্তার ID ${lead.caseReport.completedByDoctorId}`
                    : ""}
                </p>
              ) : (
                <p className="mt-2 text-xs text-amber-700">খসড়া — এখনও সম্পন্ন হয়নি।</p>
              )}
              <dl className="mt-4 grid gap-3 text-sm">
                {lead.caseReport.doctorAdvice ? (
                  <div>
                    <dt className="text-xs text-zinc-500">পরামর্শ / নোট</dt>
                    <dd className="whitespace-pre-wrap text-zinc-900">
                      {lead.caseReport.doctorAdvice}
                    </dd>
                  </div>
                ) : null}
                {lead.caseReport.diagnosis ? (
                  <div>
                    <dt className="text-xs text-zinc-500">নির্ণয়</dt>
                    <dd className="whitespace-pre-wrap text-zinc-900">
                      {lead.caseReport.diagnosis}
                    </dd>
                  </div>
                ) : null}
                {lead.caseReport.treatmentGiven ? (
                  <div>
                    <dt className="text-xs text-zinc-500">চিকিৎসা</dt>
                    <dd className="whitespace-pre-wrap text-zinc-900">
                      {lead.caseReport.treatmentGiven}
                    </dd>
                  </div>
                ) : null}
                {lead.caseReport.medicineAdvice ? (
                  <div>
                    <dt className="text-xs text-zinc-500">ঔষধ পরামর্শ</dt>
                    <dd className="whitespace-pre-wrap text-zinc-900">
                      {lead.caseReport.medicineAdvice}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-zinc-500">ফলো-আপ</dt>
                  <dd className="text-zinc-900">
                    {lead.caseReport.followUpNeeded ? "হ্যাঁ" : "না"}
                    {lead.caseReport.nextFollowUpAt
                      ? ` · ${formatDateTime(lead.caseReport.nextFollowUpAt)}`
                      : ""}
                  </dd>
                </div>
                {lead.caseReport.publicShowcaseEligible ? (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                    <dt className="text-xs font-medium text-emerald-800">
                      পাবলিক শোকেস (শুধু সাধারণ বিবরণ — গ্রাহকের সনাক্তকারী তথ্য নয়)
                    </dt>
                    <dd className="mt-2 text-zinc-900">
                      <p className="font-medium">
                        {lead.caseReport.showcaseTitle ?? "—"}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm">
                        {lead.caseReport.showcaseSummary ?? "—"}
                      </p>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </AdminDetailSection>
          ) : null}

          <AdminDetailSection
            title="ডাক্তারের পর্যবেক্ষণ / ভিজিট"
            subtitle="ফিল্ড ভিজিট ও পর্যবেক্ষণ নোট।"
          >
            {lead.observations.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-600">
                এখনও কোনো পর্যবেক্ষণ নেই।
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {lead.observations.map((o) => (
                  <li
                    key={o.id}
                    className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-sm"
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
          </AdminDetailSection>

          <AdminDetailSection
            title="নোট ও ফলো-আপ ইতিহাস"
            subtitle="সর্বশেষ উপরে — স্ট্যাটাস পরিবর্তনও এখানে রেকর্ড হয়।"
          >

            {lead.notes.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
                এখনও কোনো নোট নেই। নিচে নোট যোগ করুন।
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {lead.notes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-3 text-sm"
                  >
                    <p className="whitespace-pre-wrap text-zinc-900">{n.note}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
                      <span>
                        {formatDateTime(n.createdAt)}
                      </span>
                      {n.createdBy != null && n.createdBy !== "" && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{n.createdBy}</span>
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 border-t border-zinc-100 pt-6">
              <LeadNoteForm leadId={lead.id} />
            </div>
          </AdminDetailSection>
        </div>
      </AdminMain>
    </AdminAppShell>
  );
}
