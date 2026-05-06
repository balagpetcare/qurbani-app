import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  children?: ReactNode;
};

export function PanelEmptyState({ title, description, children }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-12 text-center sm:px-8 sm:py-16">
      <p className="text-base font-semibold leading-snug text-zinc-800 sm:text-lg">{title}</p>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-base">{description}</p>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
