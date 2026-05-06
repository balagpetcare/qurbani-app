import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminFilterPanel } from "@/components/admin/ui/AdminFilterPanel";
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

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  const t = s.trim();
  return t.length ? t : undefined;
}

export default async function AdminDoctorApplicationsPage({
  searchParams,
}: PageProps) {
  const raw = await searchParams;
  const statusRaw = firstString(raw.status);
  const status =
    statusRaw &&
    Object.values(DoctorApplicationStatus).includes(
      statusRaw as DoctorApplicationStatus,
    )
      ? (statusRaw as DoctorApplicationStatus)
      : undefined;

  const areaIdRaw = firstString(raw.areaId);
  let areaId: number | undefined;
  if (areaIdRaw) {
    const n = parseInt(areaIdRaw, 10);
    if (!Number.isNaN(n) && n > 0) areaId = n;
  }

  const [applications, areas] = await Promise.all([
    prisma.doctorApplication.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(areaId !== undefined
          ? { areas: { some: { areaId } } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        areas: {
          include: {
            area: { select: { name: true, nameBn: true } },
          },
        },
      },
    }),
    prisma.area.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, nameBn: true },
    }),
  ]);

  return (
    <AdminAppShell>
      <AdminNav title="ডাক্তার আবেদন" />

      <AdminMain className="space-y-6">
        <AdminFilterPanel title="সার্চ ও ফিল্টার">
        <form
          className="grid gap-4 sm:grid-cols-2"
          method="get"
        >
          <div className="w-full sm:w-auto">
            <label htmlFor="f-app-status" className="block text-xs font-medium text-zinc-600">
              স্ট্যাটাস
            </label>
            <select
              id="f-app-status"
              name="status"
              defaultValue={status ?? ""}
              className="mt-1 min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base sm:text-sm"
            >
              <option value="">সব</option>
              {(Object.keys(STATUS_LABEL) as DoctorApplicationStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="f-app-area" className="block text-xs font-medium text-zinc-600">
              এলাকা
            </label>
            <select
              id="f-app-area"
              name="areaId"
              defaultValue={areaId !== undefined ? String(areaId) : ""}
              className="mt-1 min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-base sm:text-sm"
            >
              <option value="">সব</option>
              {areas.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.nameBn ? `${a.name} (${a.nameBn})` : a.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-700 touch-manipulation sm:w-auto sm:text-sm"
          >
            ফিল্টার করুন
          </button>
          <Link
            href="/admin/doctor-applications"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-base font-medium text-zinc-800 hover:bg-zinc-50 touch-manipulation sm:w-auto sm:text-sm"
          >
            সাফ
          </Link>
        </form>
        </AdminFilterPanel>

        {applications.length === 0 ? (
          <AdminEmptyState title="কোনো আবেদন নেই" />
        ) : (
          <ul className="space-y-3">
            {applications.map((app) => (
              <li key={app.id}>
                <AdminCard className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-zinc-900">{app.name}</p>
                    <p className="text-sm text-zinc-600">
                      {formatPhoneForDisplay(app.phone)}
                      {app.email ? ` · ${app.email}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {app.areas
                        .map((x) => x.area.nameBn ?? x.area.name)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-800 ring-1 ring-zinc-200">
                      {STATUS_LABEL[app.status]}
                    </span>
                    <p className="mt-2 text-zinc-500">
                      {formatDateTime(app.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Link
                    href={`/admin/doctor-applications/${app.id}`}
                    className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-base font-semibold text-white hover:bg-emerald-700 touch-manipulation sm:w-auto sm:text-sm"
                  >
                    বিস্তারিত দেখুন →
                  </Link>
                </div>
              </AdminCard>
              </li>
            ))}
          </ul>
        )}
      </AdminMain>
    </AdminAppShell>
  );
}
