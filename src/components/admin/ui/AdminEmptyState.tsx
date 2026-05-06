import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function AdminEmptyState({ title, description, action, className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center shadow-[var(--q-card-shadow-sm)] sm:rounded-3xl ${className}`.trim()}
    >
      <p className="text-lg font-semibold text-zinc-800">{title}</p>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
