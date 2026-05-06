import type { ReactNode } from "react";

import { AppCard } from "@/components/ui/AppCard";

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function AppEmptyState({
  title,
  description,
  icon,
  action,
  className = "",
}: Props) {
  return (
    <AppCard variant="inset" className={`text-center ${className}`}>
      {icon ? (
        <div className="mb-3 flex justify-center text-3xl text-q-muted" aria-hidden>
          {icon}
        </div>
      ) : null}
      <p className="text-base font-semibold text-zinc-900">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-q-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </AppCard>
  );
}
