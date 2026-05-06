import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const toneClass: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-800 ring-zinc-200",
  success: "bg-emerald-50 text-emerald-950 ring-emerald-200",
  warning: "bg-amber-50 text-amber-950 ring-amber-200",
  danger: "bg-red-50 text-red-950 ring-red-200",
  info: "bg-sky-50 text-sky-950 ring-sky-200",
};

type Props = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

/** Small administrative status pill (non–lead-specific). */
export function AdminStatusBadge({ children, tone = "neutral", className = "" }: Props) {
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneClass[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  );
}
