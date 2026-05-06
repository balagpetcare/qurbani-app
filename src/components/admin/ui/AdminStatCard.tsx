import type { ReactNode } from "react";

import { AppStatCard } from "@/components/ui/AppStatCard";

type Props = {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "default" | "gold" | "danger";
  className?: string;
};

/** Thin alias so admin pages use one naming scheme; delegates to AppStatCard. */
export function AdminStatCard({ className, ...rest }: Props) {
  return <AppStatCard {...rest} className={`h-full ${className ?? ""}`.trim()} />;
}
