import type { LeadPriority } from "@/generated/prisma/enums";
import { LeadPriority as LeadPriorityEnum } from "@/generated/prisma/enums";

type Props = {
  priority: LeadPriority;
  className?: string;
};

export function LeadPriorityBadge({ priority, className = "" }: Props) {
  if (priority === LeadPriorityEnum.NORMAL) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 ring-1 ring-zinc-200 ${className}`}
      >
        সাধারণ
      </span>
    );
  }
  if (priority === LeadPriorityEnum.URGENT) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950 ring-1 ring-amber-400/40 ${className}`}
      >
        জরুরি
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-950 ring-1 ring-red-500/35 ${className}`}
    >
      ইমার্জেন্সি
    </span>
  );
}
