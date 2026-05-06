import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { BrowserNotifyHint } from "@/components/admin/BrowserNotifyHint";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { AdminResponsiveTable } from "@/components/admin/ui/AdminResponsiveTable";
import { adminLeadDetailPath } from "@/lib/admin-routes";
import { formatDateTime } from "@/lib/format";
import { formatPhoneForDisplay } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { NotificationType } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

function isEmergencyQueueRow(n: {
  type: string;
  message: string;
}): boolean {
  return (
    n.type === NotificationType.EMERGENCY_LEAD ||
    n.message.includes("[জরুরি") ||
    n.message.includes("[EMERGENCY]")
  );
}

export default async function AdminNotificationsPage() {
  const notifications = await prisma.notification.findMany({
    take: PAGE_SIZE,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      channel: true,
      status: true,
      recipientName: true,
      recipientPhone: true,
      message: true,
      createdAt: true,
      leadId: true,
    },
  });

  return (
    <AdminAppShell>
      <AdminNav
        title="নোটিফিকেশন"
        subtitle="ইন-অ্যাপ কিউ · জরুরি সারি হাইলাইট"
      />

      <AdminMain className="space-y-6">
        <div className="max-w-xl">
          <BrowserNotifyHint />
        </div>
        <p className="text-sm leading-relaxed text-zinc-600">
          সর্বশেষ {PAGE_SIZE} টি রেকর্ড · অভ্যন্তরীণ কিউ; জরুরি ট্যাগযুক্ত সারি হাইলাইট করা হয়।
        </p>

        {notifications.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-12 text-center text-sm leading-relaxed text-zinc-600 shadow-[var(--q-card-shadow-sm)]">
            এখনও কোনো নোটিফিকেশন নেই। লিড জমা দিন বা ডাক্তার অ্যাসাইন করলে এখানে কিউতে যোগ হবে।
          </p>
        ) : (
          <>
            <AdminResponsiveTable className="mt-6 hidden lg:block">
              <table className="min-w-[920px] w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">তৈরি</th>
                    <th className="px-4 py-3">ধরন</th>
                    <th className="px-4 py-3">চ্যানেল</th>
                    <th className="px-4 py-3">স্ট্যাটাস</th>
                    <th className="px-4 py-3">প্রাপক</th>
                    <th className="px-4 py-3">বার্তা</th>
                    <th className="px-4 py-3">লিড</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((n) => (
                    <tr
                      key={n.id}
                      className={`border-b border-zinc-100 align-top last:border-0 ${
                        isEmergencyQueueRow(n) ? "bg-red-50/60" : ""
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                        {formatDateTime(n.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        <div className="flex flex-wrap items-center gap-2">
                          {isEmergencyQueueRow(n) ? (
                            <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              জরুরি
                            </span>
                          ) : null}
                          <span>{n.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-700">{n.channel}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
                          {n.status}
                        </span>
                      </td>
                      <td className="max-w-[12rem] px-4 py-3 text-zinc-700">
                        <div className="font-medium text-zinc-900">
                          {n.recipientName ?? "—"}
                        </div>
                        {n.recipientPhone ? (
                          <div className="text-xs text-zinc-600">
                            {formatPhoneForDisplay(n.recipientPhone)}
                          </div>
                        ) : null}
                      </td>
                      <td className="max-w-xl px-4 py-3">
                        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-800">
                          {n.message}
                        </pre>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {n.leadId != null ? (
                          <Link
                            href={adminLeadDetailPath(n.leadId)}
                            className="font-medium text-emerald-700 hover:text-emerald-900"
                          >
                            #{n.leadId} →
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminResponsiveTable>

            <ul className="mt-6 space-y-3 lg:hidden">
              {notifications.map((n) => (
                <li key={n.id}>
                  <AdminCard
                    className={`p-4 ${
                    isEmergencyQueueRow(n)
                      ? "border-red-300 ring-1 ring-red-100"
                      : ""
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase text-zinc-500">
                      {isEmergencyQueueRow(n) ? (
                        <span className="mr-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          জরুরি
                        </span>
                      ) : null}
                      {n.type}
                    </span>
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
                      {n.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {n.channel} ·{" "}
                    {formatDateTime(n.createdAt)}
                  </p>
                  {(n.recipientName || n.recipientPhone) && (
                    <p className="mt-2 text-sm text-zinc-800">
                      <span className="font-medium">{n.recipientName ?? ""}</span>
                      {n.recipientPhone ? (
                        <span className="block text-xs text-zinc-600">
                          {formatPhoneForDisplay(n.recipientPhone)}
                        </span>
                      ) : null}
                    </p>
                  )}
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-800">
                    {n.message}
                  </pre>
                  {n.leadId != null ? (
                    <Link
                      href={adminLeadDetailPath(n.leadId)}
                      className="mt-3 inline-flex min-h-[44px] items-center text-base font-semibold text-emerald-800 underline-offset-2 hover:underline"
                    >
                      লিড #{n.leadId} বিস্তারিত →
                    </Link>
                  ) : null}
                </AdminCard>
                </li>
              ))}
            </ul>
          </>
        )}
      </AdminMain>
    </AdminAppShell>
  );
}
