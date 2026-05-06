import type { ReactNode } from "react";

type Props = {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function AppField({
  id,
  label,
  hint,
  error,
  required,
  children,
  className = "",
}: Props) {
  return (
    <div className={`min-w-0 space-y-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-zinc-800"
      >
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs leading-relaxed text-q-muted">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
