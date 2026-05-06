import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

const fieldClass =
  "h-[var(--q-touch-min)] w-full min-w-0 rounded-2xl border border-zinc-200 bg-white px-4 text-[15px] text-zinc-900 outline-none transition-[border-color,box-shadow] placeholder:text-zinc-400 focus:border-q-primary focus:ring-2 focus:ring-q-primary/20 disabled:bg-zinc-50";

export function AppInput({ className = "", ...rest }: Props) {
  return <input className={`${fieldClass} ${className}`} {...rest} />;
}
