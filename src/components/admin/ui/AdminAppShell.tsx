import type { ReactNode } from "react";

/** Root wrapper for logged-in admin pages (overflow + typography baseline). */
export function AdminAppShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 overflow-x-clip text-zinc-900 ${className}`.trim()}>
      {children}
    </div>
  );
}
