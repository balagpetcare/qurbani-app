import type { ReactNode } from "react";

import { AppCard } from "@/components/ui/AppCard";

type Props = {
  title?: string;
  message: string;
  action?: ReactNode;
  className?: string;
};

export function AppErrorState({
  title = "সমস্যা হয়েছে",
  message,
  action,
  className = "",
}: Props) {
  return (
    <AppCard
      variant="inset"
      className={`border border-red-100 bg-red-50/50 ${className}`}
    >
      <p className="text-sm font-bold text-red-900">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-red-800/90">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </AppCard>
  );
}
