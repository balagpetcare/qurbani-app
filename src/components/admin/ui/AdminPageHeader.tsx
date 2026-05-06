import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  /** Smaller title row for detail screens. */
  compact?: boolean;
  trailing?: ReactNode;
};

/** Title + subtitle row inside the green admin header (no nav). */
export function AdminPageHeader({ title, subtitle, compact, trailing }: Props) {
  return (
    <div className="flex min-w-0 items-start gap-2 sm:gap-3">
      <div className="min-w-0 flex-1">
        <h1
          className={`font-bold leading-snug tracking-tight text-white ${
            compact ? "text-base sm:text-lg" : "text-lg sm:text-xl"
          }`}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm leading-relaxed text-white/85">{subtitle}</p>
        ) : null}
      </div>
      {trailing ? <div className="flex shrink-0 items-start gap-2">{trailing}</div> : null}
    </div>
  );
}
