import Link from "next/link";

import { DoctorActiveToggle } from "@/components/admin/DoctorActiveToggle";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { AdminResponsiveTable } from "@/components/admin/ui/AdminResponsiveTable";
import { UserRole } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/format";
import { formatPhoneForDisplay } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDoctorsPage() {
  const doctors = await prisma.user.findMany({
    where: { role: UserRole.DOCTOR },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      whatsapp: true,
      areaCoverage: true,
      emergencyAvailable: true,
      notes: true,
      isActive: true,
      createdAt: true,
      doctorAreas: {
        select: {
          area: { select: { name: true, nameBn: true } },
        },
      },
    },
  });

  return (
    <AdminAppShell>
      <AdminNav title="ডাক্তার ব্যবস্থাপনা" />

      <AdminMain className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-zinc-600">
            ডাক্তার তৈরি, সম্পাদনা ও এলাকা নির্ধারণ।
          </p>
          <Link
            href="/admin/doctors/new"
            className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-[var(--q-card-shadow-sm)] hover:bg-emerald-700 touch-manipulation"
          >
            + নতুন ডাক্তার
          </Link>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-zinc-900">ডাক্তার তালিকা</h2>
          <p className="mt-1 text-sm text-zinc-500">
            লিড অ্যাসাইন ও ডাক্তার প্যানেলের জন্য সক্রিয় ডাক্তার ব্যবহার করুন।
          </p>

          {doctors.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center text-zinc-600">
              এখনও কোনো ডাক্তার নেই। উপরের বাটন থেকে যোগ করুন।
            </div>
          ) : (
            <>
          <AdminResponsiveTable className="mt-4 hidden lg:block">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">নাম</th>
                      <th className="px-4 py-3 font-medium">ফোন</th>
                      <th className="px-4 py-3 font-medium">WhatsApp</th>
                      <th className="px-4 py-3 font-medium">ইমেইল</th>
                      <th className="px-4 py-3 font-medium">এলাকা</th>
                      <th className="px-4 py-3 font-medium">সক্রিয়</th>
                      <th className="px-4 py-3 font-medium">তৈরি</th>
                      <th className="px-4 py-3 font-medium">কর্ম</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {doctors.map((d) => (
                      <tr key={d.id} className="hover:bg-zinc-50/80">
                        <td className="px-4 py-3 font-medium text-zinc-900">
                          <Link
                            href={`/admin/doctors/${d.id}/edit`}
                            className="text-emerald-800 hover:underline"
                          >
                            {d.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-zinc-700">
                          {d.phone ? formatPhoneForDisplay(d.phone) : "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {d.whatsapp ? formatPhoneForDisplay(d.whatsapp) : "—"}
                        </td>
                        <td className="max-w-[140px] truncate px-4 py-3 text-zinc-600">
                          {d.email ?? "—"}
                        </td>
                        <td
                          className="max-w-[220px] truncate px-4 py-3 text-zinc-600"
                          title={
                            d.doctorAreas.map((x) => x.area.nameBn ?? x.area.name).join(", ") ||
                            d.areaCoverage ||
                            undefined
                          }
                        >
                          {d.doctorAreas.length > 0
                            ? d.doctorAreas.map((x) => x.area.nameBn ?? x.area.name).join(", ")
                            : d.areaCoverage ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              d.isActive
                                ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-600/20"
                                : "rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-300"
                            }
                          >
                            {d.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">
                          {formatDateTime(d.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/admin/doctors/${d.id}/edit`}
                              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
                            >
                              সম্পাদনা
                            </Link>
                            <DoctorActiveToggle doctorId={d.id} isActive={d.isActive} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminResponsiveTable>

              <ul className="mt-4 space-y-3 lg:hidden">
                {doctors.map((d) => (
                <li key={d.id}>
                  <AdminCard className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/admin/doctors/${d.id}/edit`}
                        className="font-semibold text-emerald-900 hover:underline"
                      >
                        {d.name}
                      </Link>
                      <span
                        className={
                          d.isActive
                            ? "shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-900 ring-1 ring-emerald-600/20"
                            : "shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-zinc-600"
                        }
                      >
                        {d.isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
                      </span>
                    </div>
                    <dl className="mt-3 space-y-1 text-xs text-zinc-600">
                      <div>
                        <dt className="text-zinc-400">ফোন</dt>
                        <dd>{d.phone ? formatPhoneForDisplay(d.phone) : "—"}</dd>
                      </div>
                      {d.whatsapp && (
                        <div>
                          <dt className="text-zinc-400">WhatsApp</dt>
                          <dd>{formatPhoneForDisplay(d.whatsapp)}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="text-zinc-400">তৈরি</dt>
                        <dd>{formatDateTime(d.createdAt)}</dd>
                      </div>
                      {(d.doctorAreas.length > 0 || d.areaCoverage) && (
                        <div>
                          <dt className="text-zinc-400">এলাকা</dt>
                          <dd>
                            {d.doctorAreas.length > 0
                              ? d.doctorAreas
                                  .map((x) => x.area.nameBn ?? x.area.name)
                                  .join(", ")
                              : d.areaCoverage}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <DoctorActiveToggle doctorId={d.id} isActive={d.isActive} />
                    </div>
                  </AdminCard>
                </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </AdminMain>
    </AdminAppShell>
  );
}
