import type { ReactNode } from "react";

type Variant = "default" | "hero" | "flat" | "inset";

type Props = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  as?: "div" | "article" | "section";
};

export function AppCard({
  children,
  variant = "default",
  className = "",
  as: Tag = "div",
}: Props) {
  const base = "min-w-0 rounded-[var(--q-card-radius)]";

  const styles: Record<Variant, string> = {
    default: `${base} bg-white p-4 shadow-[var(--q-card-shadow-sm)] ring-1 ring-black/[0.04] sm:p-5`,
    hero: `${base} bg-white p-5 shadow-[var(--q-card-shadow)] ring-1 ring-emerald-900/10 sm:p-6`,
    flat: `${base} bg-q-primary-soft/60 p-4 ring-1 ring-emerald-900/8 sm:p-5`,
    inset: `${base} bg-zinc-50/90 p-4 ring-1 ring-zinc-200/80 sm:p-5`,
  };

  return <Tag className={`${styles[variant]} ${className}`}>{children}</Tag>;
}
