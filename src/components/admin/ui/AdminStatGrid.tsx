import type { ReactNode } from "react";

export function AdminStatGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 xl:grid-cols-4 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
