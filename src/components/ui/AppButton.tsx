import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "gold" | "ghost" | "danger";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
  /** Full width for mobile forms */
  block?: boolean;
};

export function AppButton({
  variant = "primary",
  block,
  className = "",
  children,
  type = "button",
  ...rest
}: Props) {
  const base =
    "inline-flex min-h-[var(--q-touch-min)] items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-semibold touch-manipulation transition-[transform,box-shadow,background-color] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";

  const variants: Record<Variant, string> = {
    primary:
      "bg-q-primary text-white shadow-md shadow-emerald-900/15 hover:bg-q-primary-deep",
    secondary:
      "border-2 border-q-primary bg-white text-q-primary-deep hover:bg-q-primary-soft",
    gold: "bg-[var(--q-accent-gold)] text-emerald-950 shadow-md hover:bg-[var(--q-accent-gold-hover)]",
    ghost: "bg-transparent text-q-primary hover:bg-q-primary-soft",
    danger: "bg-red-600 text-white shadow-md hover:bg-red-700",
  };

  const w = block ? "w-full" : "";

  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${w} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
