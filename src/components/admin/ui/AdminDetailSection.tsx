import type { ReactNode } from "react";

import { AdminCard } from "./AdminCard";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
};

/** Lead/detail info block — matches AdminCard shell + typography. */
export function AdminDetailSection({
  title,
  subtitle,
  children,
  className = "",
}: Props) {
  return (
    <AdminCard className={`p-4 shadow-[var(--q-card-shadow-sm)] sm:p-6 ${className}`.trim()}>
      <h2 className="text-sm font-bold leading-snug text-zinc-900 sm:text-base">{title}</h2>
      {subtitle ? (
        <p className="mt-1 text-sm leading-relaxed text-zinc-600">{subtitle}</p>
      ) : null}
      <div className="mt-3 min-w-0 sm:mt-4">{children}</div>
    </AdminCard>
  );
}
