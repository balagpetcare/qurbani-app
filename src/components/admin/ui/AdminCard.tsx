import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
};

/** Primary surface card for admin content (aligned with app shell radius + shadow). */
export function AdminCard({
  children,
  className = "",
  as: Tag = "div",
}: Props) {
  return (
    <Tag
      className={`min-w-0 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-[var(--q-card-shadow-sm)] ring-1 ring-black/[0.03] sm:rounded-3xl sm:p-5 ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
