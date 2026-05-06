import type { ReactNode } from "react";

type Props = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminPageSection({
  title,
  description,
  action,
  children,
  className = "",
}: Props) {
  return (
    <section className={`min-w-0 ${className}`}>
      {(title || description || action) && (
        <div className="mb-3 flex min-w-0 flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-base font-bold leading-snug text-zinc-900 sm:text-lg">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-sm leading-relaxed text-q-muted">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
