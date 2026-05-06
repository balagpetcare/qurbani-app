import Link from "next/link";
import { notFound } from "next/navigation";

import { DoctorApplicationActions } from "@/components/admin/DoctorApplicationActions";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { DoctorApplicationStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/format";
import { formatPhoneForDisplay } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<DoctorApplicationStatus, string> = {
  [DoctorApplicationStatus.NEW]: "নতুন",
  [DoctorApplicationStatus.REVIEWED]: "রিভিউ",
  [DoctorApplicationStatus.APPROVED]: "অনুমোদিত",
  [DoctorApplicationStatus.REJECTED]: "প্রত্যাখ্যাত",
  [DoctorApplicationStatus.CONVERTED_TO_DOCTOR]: "ডাক্তার তৈরি",
};

type PageProps = { params: Promise<{ id: string }> };

export default async function AdminDoctorApplicationDetailPage({
  params,
}: PageProps) {
  const { id: raw } = await params;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) notFound();

  const app = await prisma.doctorApplication.findUnique({
    where: { id },
    include: {
      areas: {
        include: {
          area: { select: { id: true, name: true, nameBn: true } },
        },
      },
      reviewedBy: { select: { id: true, name: true, email: true } },
      convertedUser: { select: { id: true, name: true, email: true } },
    },
  });

  if (!app) notFound();

  const areaOptions = await prisma.area.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, nameBn: true },
  });

  return (
    <AdminAppShell>
      <AdminNav title="ডাক্তার আবেদন" narrow subtitle={`#${app.id}`} />

      <AdminMain variant="narrow" className="space-y-6">
        <Link
          href="/admin/doctor-applications"
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          ← তালিকা
        </Link>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">
            স্ট্যাটাস:{" "}
            <span className="font-semibold text-zinc-900">
              {STATUS_LABEL[app.status]}
            </span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            জমা: {formatDateTime(app.createdAt)}
            {app.reviewedAt ? ` · রিভিউ: ${formatDateTime(app.reviewedAt)}` : ""}
          </p>
          {app.reviewedBy ? (
            <p className="mt-1 text-xs text-zinc-500">
              রিভিউ করেছেন: {app.reviewedBy.name}
            </p>
          ) : null}
          {app.convertedUser ? (
            <p className="mt-2 text-sm text-emerald-800">
              ডাক্তার অ্যাকাউন্ট:{" "}
              <Link
                href={`/admin/doctors/${app.convertedUser.id}/edit`}
                className="font-semibold underline"
              >
                {app.convertedUser.name}
              </Link>{" "}
              ({app.convertedUser.email})
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            আবেদনকারী
          </h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-zinc-500">নাম</dt>
              <dd className="font-medium text-zinc-900">{app.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">ফোন</dt>
              <dd>{formatPhoneForDisplay(app.phone)}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">WhatsApp</dt>
              <dd>
                {app.whatsapp ? formatPhoneForDisplay(app.whatsapp) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">ইমেইল</dt>
              <dd>{app.email ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-500">ঠিকানা</dt>
              <dd className="whitespace-pre-wrap">{app.address ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-500">যোগ্যতা</dt>
              <dd className="whitespace-pre-wrap">{app.qualification ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-500">অভিজ্ঞতা</dt>
              <dd className="whitespace-pre-wrap">{app.experience ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-500">এলাকা</dt>
              <dd>
                {app.areas.length === 0
                  ? "—"
                  : app.areas.map((x) => x.area.nameBn ?? x.area.name).join(", ")}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-zinc-500">নোট</dt>
              <dd className="whitespace-pre-wrap">{app.note ?? "—"}</dd>
            </div>
          </dl>
        </section>

        {app.status !== DoctorApplicationStatus.CONVERTED_TO_DOCTOR &&
        app.status !== DoctorApplicationStatus.REJECTED ? (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              কার্যক্রম
            </h2>
            <div className="mt-4">
              <DoctorApplicationActions
                key={[
                  app.id,
                  app.areas.map((x) => x.areaId).join(","),
                  app.adminReviewNote ?? "",
                ].join("|")}
                applicationId={app.id}
                status={app.status}
                areas={areaOptions}
                initialAreaIds={app.areas.map((x) => x.areaId)}
                initialAdminReviewNote={app.adminReviewNote}
                applicantEmail={app.email}
              />
            </div>
          </section>
        ) : null}
      </AdminMain>
    </AdminAppShell>
  );
}
