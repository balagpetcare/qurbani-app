import type { ReactNode } from "react";

import { AppBadge } from "@/components/ui/AppBadge";
import { AppCard } from "@/components/ui/AppCard";

type Props = {
  title?: string;
  message: string;
  children?: ReactNode;
  className?: string;
};

/** Doctor-facing: case taken by another doctor / contact hidden */
export function AppLockedState({
  title = "গোপনীয় তথ্য",
  message,
  children,
  className = "",
}: Props) {
  return (
    <AppCard variant="flat" className={`border border-amber-200/80 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <AppBadge tone="warning">লক</AppBadge>
        {title ? (
          <span className="text-sm font-bold text-amber-950">{title}</span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-amber-950/90">{message}</p>
      {children}
    </AppCard>
  );
}
