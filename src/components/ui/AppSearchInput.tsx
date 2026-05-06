import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

const fieldClass =
  "h-[var(--q-touch-min)] w-full min-w-0 rounded-2xl border border-zinc-200 bg-white px-4 py-2 pl-10 text-[15px] text-zinc-900 outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400 focus:border-q-primary focus:ring-2 focus:ring-q-primary/20";

export function AppSearchInput({ className = "", ...rest }: Props) {
  return (
    <div className="relative min-w-0">
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        aria-hidden
      >
        ⌕
      </span>
      <input className={`${fieldClass} ${className}`} {...rest} />
    </div>
  );
}
