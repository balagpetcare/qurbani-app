import type { SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement>;

const fieldClass =
  "h-[var(--q-touch-min)] w-full min-w-0 appearance-none rounded-2xl border border-zinc-200 bg-white px-4 pr-10 text-[15px] font-medium text-zinc-900 outline-none transition-[border-color,box-shadow] focus:border-q-primary focus:ring-2 focus:ring-q-primary/20 disabled:bg-zinc-50";

export function AppSelect({ className = "", children, ...rest }: Props) {
  return (
    <div className="relative min-w-0">
      <select className={`${fieldClass} ${className}`} {...rest}>
        {children}
      </select>
      <span
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
        aria-hidden
      >
        ▾
      </span>
    </div>
  );
}
