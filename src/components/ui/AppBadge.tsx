import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "gold";

type Props = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

const tones: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-800 ring-zinc-200/80",
  success: "bg-emerald-100 text-emerald-900 ring-emerald-200/80",
  warning: "bg-amber-100 text-amber-950 ring-amber-200/80",
  danger: "bg-red-100 text-red-900 ring-red-200/80",
  info: "bg-sky-100 text-sky-950 ring-sky-200/80",
  gold: "bg-amber-50 text-amber-950 ring-amber-300/60",
};

export function AppBadge({
  children,
  tone = "neutral",
  className = "",
}: Props) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
