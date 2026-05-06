import Link from "next/link";
import type { ReactNode } from "react";

import { LeadPriorityBadge } from "@/components/admin/LeadPriorityBadge";
import { LeadStatusBadge } from "@/components/admin/LeadStatusBadge";
import { AppCard } from "@/components/ui/AppCard";
import type { LeadPriority, LeadStatus } from "@/generated/prisma/enums";
import { toBengaliDigits } from "@/lib/bn-digits";

type Props = {
  id: number;
  customerName: string;
  status: LeadStatus;
  priority: LeadPriority;
  problemSummary: string;
  /** One line: ডাঃ নাম / পুল / আপনার কেস */
  doctorLabel: string;
  areaLabel?: string | null;
  animalLabel: string;
  createdAtLabel: string;
  href: string;
  /** Locked by another doctor (peer preview) */
  isPeerLocked?: boolean;
  isMine?: boolean;
  /** e.g. quick status controls */
  footer?: ReactNode;
  className?: string;
};

function shellTone(priority: LeadPriority): string {
  if (priority === "EMERGENCY") {
    return "rounded-2xl border border-red-200/90 bg-red-50/45 shadow-[0_10px_36px_-20px_rgba(220,38,38,0.35)] ring-1 ring-red-100/70";
  }
  if (priority === "URGENT") {
    return "rounded-2xl border border-amber-200/90 bg-amber-50/40 ring-1 ring-amber-100/80";
  }
  return "rounded-2xl border border-zinc-100/90 bg-white ring-1 ring-black/[0.05] shadow-[var(--q-card-shadow-sm)]";
}

export function AppLeadCard({
  id,
  customerName,
  status,
  priority,
  problemSummary,
  doctorLabel,
  areaLabel,
  animalLabel,
  createdAtLabel,
  href,
  isPeerLocked,
  isMine,
  footer,
  className = "",
}: Props) {
  return (
    <article
      className={`min-w-0 touch-manipulation ${className}`.trim()}
    >
      <AppCard variant="default" className={`!p-3.5 sm:!p-4 ${shellTone(priority)}`}>
        <div className="min-w-0">
          <h3 className="text-base font-bold leading-snug tracking-tight text-zinc-900">
            {customerName}
          </h3>
          <p className="mt-0.5 text-[11px] font-medium text-q-muted">
            লিড #{toBengaliDigits(id)}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <LeadPriorityBadge priority={priority} />
            <LeadStatusBadge status={status} />
            {isPeerLocked ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-950 ring-1 ring-amber-300/40">
                অন্য ডাক্তার
              </span>
            ) : null}
            {isMine ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-950 ring-1 ring-emerald-300/50">
                আমার কেস
              </span>
            ) : null}
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-zinc-100/90 pt-3 text-sm text-zinc-800">
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              ডাক্তার / কেস
            </dt>
            <dd className="mt-0.5 font-medium leading-snug break-words text-zinc-900">
              {doctorLabel}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              এলাকা
            </dt>
            <dd className="mt-0.5 leading-snug break-words">{areaLabel ?? "—"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              পশু
            </dt>
            <dd className="mt-0.5 leading-snug break-words">{animalLabel}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              সময়
            </dt>
            <dd className="mt-0.5 text-xs leading-snug text-zinc-700">{createdAtLabel}</dd>
          </div>
          <div className="col-span-2 min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
              সমস্যা
            </dt>
            <dd className="mt-0.5 line-clamp-2 leading-relaxed break-words text-zinc-800">
              {problemSummary}
            </dd>
          </div>
        </dl>

        <Link
          href={href}
          className="mt-3.5 flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition active:bg-emerald-700 sm:text-base"
        >
          বিস্তারিত / যোগাযোগ
        </Link>

        {footer ? (
          <div className="mt-3 border-t border-zinc-100 pt-3">{footer}</div>
        ) : null}
      </AppCard>
    </article>
  );
}
