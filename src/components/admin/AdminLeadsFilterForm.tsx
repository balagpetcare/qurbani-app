import Link from "next/link";

import { AdminFilterPanel } from "@/components/admin/ui/AdminFilterPanel";
import { LeadPriority, LeadStatus } from "@/generated/prisma/enums";
import {
  LEAD_PRIORITY_LABEL_BN,
  LEAD_STATUS_LABEL_BN,
} from "@/lib/admin-labels";
import type { ParsedAdminLeadsQuery } from "@/lib/admin-leads-search";

const PRIORITY_OPTIONS = [
  LeadPriority.NORMAL,
  LeadPriority.URGENT,
  LeadPriority.EMERGENCY,
] as const;

const STATUS_OPTIONS = [
  LeadStatus.NEW,
  LeadStatus.ASSIGNED,
  LeadStatus.ACCEPTED,
  LeadStatus.IN_PROGRESS,
  LeadStatus.OBSERVED,
  LeadStatus.COMPLETED,
  LeadStatus.FOLLOW_UP_NEEDED,
  LeadStatus.CANCELLED,
  LeadStatus.REFERRED,
] as const;

const fieldClass =
  "mt-1.5 min-h-[48px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-base text-zinc-900 outline-none ring-emerald-500/25 focus:border-emerald-600 focus:ring-2 sm:mt-2 sm:rounded-2xl sm:text-sm";

type DoctorOpt = { id: number; name: string };

type Props = {
  doctors: DoctorOpt[];
  parsed: ParsedAdminLeadsQuery;
  /** GET action for the filter form (canonical: `/admin/requests`). */
  listPath?: string;
};

export function AdminLeadsFilterForm({
  doctors,
  parsed,
  listPath = "/admin/requests",
}: Props) {
  return (
    <AdminFilterPanel title="সার্চ ও ফিল্টার">
      <form
        action={listPath}
        method="get"
        className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2 sm:gap-y-4 xl:grid-cols-3"
      >
        <div className="sm:col-span-2 xl:col-span-3">
          <label htmlFor="f-q" className="block text-xs font-semibold text-zinc-700 sm:text-sm">
            নাম বা মোবাইল নম্বর
          </label>
          <input
            id="f-q"
            name="q"
            type="search"
            defaultValue={parsed.q ?? ""}
            placeholder="গ্রাহক খুঁজুন..."
            className={fieldClass}
            enterKeyHint="search"
          />
        </div>

        <div>
          <label htmlFor="f-priority" className="block text-xs font-semibold text-zinc-700 sm:text-sm">
            অগ্রাধিকার
          </label>
          <select
            id="f-priority"
            name="priority"
            defaultValue={parsed.priority ?? ""}
            className={fieldClass}
          >
            <option value="">যেকোনো অগ্রাধিকার</option>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {LEAD_PRIORITY_LABEL_BN[p]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-status" className="block text-xs font-semibold text-zinc-700 sm:text-sm">
            স্ট্যাটাস
          </label>
          <select
            id="f-status"
            name="status"
            defaultValue={parsed.status ?? ""}
            className={fieldClass}
          >
            <option value="">যেকোনো স্ট্যাটাস</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABEL_BN[s]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-doctor" className="block text-xs font-semibold text-zinc-700 sm:text-sm">
            ডাক্তার
          </label>
          <select
            id="f-doctor"
            name="doctorId"
            defaultValue={
              parsed.doctorId !== undefined ? String(parsed.doctorId) : ""
            }
            className={fieldClass}
          >
            <option value="">যেকোনো ডাক্তার</option>
            {doctors.map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-area" className="block text-xs font-semibold text-zinc-700 sm:text-sm">
            এলাকা
          </label>
          <input
            id="f-area"
            name="area"
            type="text"
            defaultValue={parsed.area ?? ""}
            placeholder="আংশিক নাম মিলিয়ে খুঁজুন"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="f-animal" className="block text-xs font-semibold text-zinc-700 sm:text-sm">
            পশুর ধরন
          </label>
          <input
            id="f-animal"
            name="animalType"
            type="text"
            defaultValue={parsed.animalType ?? ""}
            placeholder="যেমন: গরু"
            className={fieldClass}
          />
        </div>

        <div className="sm:col-span-2 xl:col-span-1">
          <label htmlFor="f-problem" className="block text-xs font-semibold text-zinc-700 sm:text-sm">
            সমস্যার ধরন
          </label>
          <input
            id="f-problem"
            name="problemCategory"
            type="text"
            defaultValue={parsed.problemCategory ?? ""}
            placeholder="যেমন: জ্বর, খায় না — বা সিস্টেম কোড"
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="f-from" className="block text-xs font-semibold text-zinc-700 sm:text-sm">
            শুরুর তারিখ
          </label>
          <input
            id="f-from"
            name="from"
            type="date"
            defaultValue={parsed.fromInput ?? ""}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="f-to" className="block text-xs font-semibold text-zinc-700 sm:text-sm">
            শেষ তারিখ
          </label>
          <input
            id="f-to"
            name="to"
            type="date"
            defaultValue={parsed.toInput ?? ""}
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-2.5 sm:col-span-2 xl:col-span-3 sm:flex-row sm:items-stretch sm:gap-3">
          <button
            type="submit"
            className="inline-flex min-h-[48px] w-full touch-manipulation items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 sm:w-auto sm:min-w-[10rem]"
          >
            ফিল্টার করুন
          </button>
          <Link
            href={listPath}
            className="inline-flex min-h-[48px] w-full items-center justify-center touch-manipulation rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3 text-center text-sm font-bold text-zinc-800 hover:bg-zinc-50 sm:w-auto sm:min-w-[10rem]"
          >
            ফিল্টার মুছুন
          </Link>
        </div>
      </form>
    </AdminFilterPanel>
  );
}
