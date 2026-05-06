import type { LeadStatus } from "@/generated/prisma/enums";
import { LEAD_STATUS_LABEL_BN } from "@/lib/admin-labels";

const STATUS_BADGE: Record<
  LeadStatus,
  string
> = {
  NEW: "bg-sky-50 text-sky-900 ring-sky-200",
  ASSIGNED: "bg-indigo-50 text-indigo-900 ring-indigo-200",
  ACCEPTED: "bg-cyan-50 text-cyan-900 ring-cyan-200",
  IN_PROGRESS: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  OBSERVED: "bg-violet-50 text-violet-900 ring-violet-200",
  COMPLETED: "bg-green-50 text-green-900 ring-green-200",
  FOLLOW_UP_NEEDED: "bg-teal-50 text-teal-900 ring-teal-200",
  CANCELLED: "bg-red-50 text-red-900 ring-red-200",
  REFERRED: "bg-amber-50 text-amber-900 ring-amber-200",
};

export function leadStatusLabel(status: LeadStatus): string {
  return LEAD_STATUS_LABEL_BN[status] ?? status;
}

type Props = {
  status: LeadStatus;
};

export function LeadStatusBadge({ status }: Props) {
  const cls = STATUS_BADGE[status] ?? "bg-zinc-100 text-zinc-800 ring-zinc-200";
  const label = LEAD_STATUS_LABEL_BN[status] ?? status;
  return (
    <span
      className={`inline-flex max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}
      title={status}
    >
      {label}
    </span>
  );
}
