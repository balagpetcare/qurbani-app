import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Wraps a `<table>` with rounded container + horizontal scroll on small viewports.
 */
export function AdminResponsiveTable({
  children,
  className = "",
}: Props) {
  return (
    <div
      className={`touch-pan-x overflow-x-auto overscroll-x-contain rounded-2xl border border-zinc-200/90 bg-white pb-1 shadow-[var(--q-card-shadow-sm)] ring-1 ring-black/[0.04] [-webkit-overflow-scrolling:touch] sm:rounded-3xl ${className}`.trim()}
    >
      {children}
    </div>
  );
}
