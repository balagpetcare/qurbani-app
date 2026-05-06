import Link from "next/link";
import type { ReactNode } from "react";

/** Solid + gradient so the bar never renders as white if CSS vars fail. */
export const APP_HEADER_GRADIENT_CLASS =
  "bg-emerald-950 bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700";

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  /** Shown before back label (e.g. Lucide). When set, the ASCII arrow is omitted. */
  backLeadingIcon?: ReactNode;
  /** Right-side actions (icon buttons, etc.) */
  actions?: ReactNode;
  /** Optional second row inside the header (e.g. mobile nav pills). */
  bottomSlot?: ReactNode;
  /** Use flat white bar instead of green gradient */
  variant?: "gradient" | "flat";
  className?: string;
  /**
   * Two-row layout: row 1 = back + actions, row 2 = title + subtitle.
   * Reduces cramped overlap on narrow viewports when both back and actions exist.
   */
  stackedTitleRow?: boolean;
};

export function AppHeader({
  title,
  subtitle,
  backHref,
  backLabel = "পিছনে",
  backLeadingIcon,
  actions,
  bottomSlot,
  variant = "gradient",
  className = "",
  stackedTitleRow = false,
}: Props) {
  const bar =
    variant === "gradient"
      ? `${APP_HEADER_GRADIENT_CLASS} text-white shadow-[0_10px_40px_-18px_rgba(6,78,59,0.45)]`
      : "border-b border-[var(--q-border)] bg-white text-[var(--foreground)]";

  const backMuted =
    variant === "gradient"
      ? "text-white/95 ring-1 ring-white/25 bg-white/10"
      : "text-q-primary ring-1 ring-q-primary/20 bg-q-primary-soft";

  const titleBlock = (
    <div className="min-w-0">
      <h1
        className={`text-lg font-bold leading-snug tracking-tight sm:text-xl ${
          variant === "gradient" ? "text-white" : "text-[var(--foreground)]"
        }`}
      >
        {title}
      </h1>
      {subtitle ? (
        <p
          className={`mt-0.5 text-sm leading-relaxed ${
            variant === "gradient" ? "text-white/85" : "text-q-muted"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );

  const actionsBlock = actions ? (
    <div className="flex shrink-0 items-center justify-end gap-2">{actions}</div>
  ) : null;

  const stackedBackLink = backHref ? (
    <Link
      href={backHref}
      className={`inline-flex min-h-[44px] max-w-full min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold touch-manipulation underline-offset-2 transition-opacity hover:opacity-95 ${backMuted}`}
    >
      {backLeadingIcon ? (
        <span className="flex shrink-0 items-center justify-center">{backLeadingIcon}</span>
      ) : null}
      <span className="min-w-0 truncate leading-tight">
        {backLeadingIcon ? backLabel : `← ${backLabel}`}
      </span>
    </Link>
  ) : null;

  if (stackedTitleRow) {
    return (
      <header className={`sticky top-0 z-30 pt-app-header ${bar} ${className}`}>
        <div
          className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 ${
            variant === "gradient" ? "border-b border-white/10" : "border-b border-zinc-100"
          }`}
        >
          <div className="min-w-0 justify-self-start">{stackedBackLink}</div>
          {actionsBlock}
        </div>
        <div className="px-4 pb-3 pt-2 sm:px-5 sm:pb-4 sm:pt-3">{titleBlock}</div>
        {bottomSlot}
      </header>
    );
  }

  return (
    <header className={`sticky top-0 z-30 pt-app-header ${bar} ${className}`}>
      <div className="flex min-w-0 items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4">
        {backHref ? (
          <Link
            href={backHref}
            className={`mt-0.5 shrink-0 rounded-xl px-2 py-1.5 text-sm font-semibold touch-manipulation underline-offset-2 transition-opacity hover:opacity-90 ${backMuted} inline-flex max-w-full min-w-0 items-center gap-1.5`}
          >
            {backLeadingIcon ? (
              <span className="flex shrink-0 items-center justify-center">{backLeadingIcon}</span>
            ) : null}
            <span className="min-w-0 truncate leading-tight">
              {backLeadingIcon ? backLabel : `← ${backLabel}`}
            </span>
          </Link>
        ) : null}
        <div className="min-w-0 flex-1">{titleBlock}</div>
        {actionsBlock}
      </div>
      {bottomSlot}
    </header>
  );
}
