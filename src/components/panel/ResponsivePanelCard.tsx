import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Extra classes on outer wrapper */
  padding?: string;
};

/** Consistent card shell for admin/doctor panels. */
export function ResponsivePanelCard({
  children,
  className = "",
  padding = "p-5 sm:p-6",
}: Props) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white shadow-sm ${padding} ${className}`}
    >
      {children}
    </div>
  );
}
