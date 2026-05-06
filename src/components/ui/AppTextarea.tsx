import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

const fieldClass =
  "min-h-[120px] w-full min-w-0 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-zinc-900 shadow-inner shadow-zinc-100/80 outline-none ring-0 transition-[border-color,box-shadow] placeholder:text-zinc-400 focus:border-q-primary focus:ring-2 focus:ring-q-primary/20 disabled:bg-zinc-50";

export function AppTextarea({ className = "", ...rest }: Props) {
  return <textarea className={`${fieldClass} ${className}`} {...rest} />;
}
