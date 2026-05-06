import type { ReactNode } from "react";

import { AppBadge } from "@/components/ui/AppBadge";
import { AppCard } from "@/components/ui/AppCard";

type Props = {
  title?: string;
  message: string;
  icon?: ReactNode;
  className?: string;
};

export function AppSuccessState({
  title = "সফল হয়েছে",
  message,
  icon,
  className = "",
}: Props) {
  return (
    <AppCard variant="hero" className={`text-center ${className}`}>
      <div className="flex flex-col items-center gap-3">
        {icon ?? (
          <span className="text-4xl" aria-hidden>
            ✓
          </span>
        )}
        <AppBadge tone="success">সফল</AppBadge>
        <p className="text-lg font-bold text-q-primary-deep">{title}</p>
        <p className="max-w-sm text-sm leading-relaxed text-q-muted">{message}</p>
      </div>
    </AppCard>
  );
}
