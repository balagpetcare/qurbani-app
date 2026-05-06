import type { ReactNode } from "react";

export type AdminMainVariant = "default" | "narrow" | "comfortable";

const variantMax: Record<AdminMainVariant, string> = {
  /** Full width of the centered admin canvas (~430px). */
  default: "max-w-full",
  /** Forms / lead detail — slightly narrower readable column inside the canvas. */
  narrow: "max-w-3xl",
  /** Dashboard-style pages that benefit from a touch more horizontal room when canvas allows. */
  comfortable: "max-w-full",
};

export function AdminMain({
  children,
  variant = "default",
  className = "",
}: {
  children: ReactNode;
  variant?: AdminMainVariant;
  /** Extra classes on `<main>` (e.g. `space-y-8`). */
  className?: string;
}) {
  return (
    <main
      className={`mx-auto w-full min-w-0 ${variantMax[variant]} px-4 py-4 pb-app-nav sm:px-5 sm:py-6 lg:pb-8 ${className}`.trim()}
    >
      {children}
    </main>
  );
}
