import type { ReactNode } from "react";

import { AdminCard } from "./AdminCard";

type Props = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function AdminFilterPanel({
  title = "সার্চ ও ফিল্টার",
  children,
  className = "",
}: Props) {
  return (
    <AdminCard className={`p-3 shadow-[var(--q-card-shadow-sm)] sm:p-5 ${className}`.trim()}>
      {title ? (
        <h2 className="text-sm font-bold leading-snug tracking-tight text-zinc-900 sm:text-base">
          {title}
        </h2>
      ) : null}
      <div className={title ? "mt-3 sm:mt-4" : ""}>{children}</div>
    </AdminCard>
  );
}
