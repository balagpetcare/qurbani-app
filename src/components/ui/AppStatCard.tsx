import type { ReactNode } from "react";

import { AppCard } from "@/components/ui/AppCard";

type Props = {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "default" | "gold" | "danger";
  className?: string;
};

export function AppStatCard({
  label,
  value,
  hint,
  accent = "default",
  className = "",
}: Props) {
  const valueColor =
    accent === "gold"
      ? "text-amber-700"
      : accent === "danger"
        ? "text-red-700"
        : "text-q-primary-deep";

  return (
    <AppCard
      variant="default"
      className={`relative flex min-h-[118px] flex-col overflow-hidden ${className}`}
    >
      {accent === "gold" ? (
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-200/40"
          aria-hidden
        />
      ) : null}
      <p className="flex-shrink-0 text-[11px] font-semibold uppercase leading-snug tracking-wide text-q-muted sm:text-xs">
        {label}
      </p>
      <div className="mt-auto flex flex-col pt-2">
        <p className={`text-2xl font-bold tabular-nums sm:text-3xl ${valueColor}`}>
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-xs leading-relaxed text-q-muted">{hint}</p>
        ) : null}
      </div>
    </AppCard>
  );
}
