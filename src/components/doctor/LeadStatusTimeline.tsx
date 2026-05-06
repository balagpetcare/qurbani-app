import { leadStatusLabel } from "@/components/admin/LeadStatusBadge";
import type { LeadStatus } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/format";

export type TimelineRow = {
  id: number;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
  actorKind: string;
  createdAt: Date;
  note: string | null;
};

type Props = { entries: TimelineRow[] };

export function LeadStatusTimeline({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-q-muted">
        এখনও কোনো টাইমলাইন রেকর্ড নেই (নতুন ওয়ার্কফ্লো থেকে যোগ হবে)।
      </p>
    );
  }

  return (
    <ol className="relative space-y-5 border-l-2 border-emerald-200/70 pl-5">
      {entries.map((e) => (
        <li key={e.id} className="relative text-sm">
          <span
            className="absolute -left-[calc(0.5rem+2px)] top-1.5 h-3 w-3 rounded-full bg-q-primary ring-4 ring-white"
            aria-hidden
          />
          <p className="font-bold text-zinc-900">
            {e.fromStatus ? (
              <>
                {leadStatusLabel(e.fromStatus)} → {leadStatusLabel(e.toStatus)}
              </>
            ) : (
              <>{leadStatusLabel(e.toStatus)}</>
            )}
          </p>
          <p className="mt-0.5 text-xs text-q-muted">
            {formatDateTime(e.createdAt)} · {e.actorKind}
            {e.note ? ` · ${e.note}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
