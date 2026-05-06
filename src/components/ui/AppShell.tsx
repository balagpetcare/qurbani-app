import type { ReactNode } from "react";

export type AppShellVariant = "customer" | "doctor" | "admin";

type Props = {
  variant: AppShellVariant;
  children: ReactNode;
  /** Sticky top region (e.g. AppHeader) */
  header?: ReactNode;
  /** Sticky bottom nav — adds safe-area padding to main */
  bottomNav?: ReactNode;
  className?: string;
  /**
   * `app` — centered phone-width column (default).
   * `wide` — responsive marketing width for landing / public directory.
   * `landing` — mint-friendly public home (~960px cap).
   */
  contentMax?: "app" | "wide" | "landing";
  /** Extra classes on `<main>` (e.g. landing `pt-0`, mobile bottom pad for floating CTA). */
  mainClassName?: string;
};

/**
 * Centered mobile-first shell (390–430px) on a soft canvas for desktop preview.
 */
export function AppShell({
  variant,
  children,
  header,
  bottomNav,
  className = "",
  contentMax = "app",
  mainClassName = "",
}: Props) {
  const mainPad = bottomNav ? "pb-app-nav" : "pb-6";
  const innerMax =
    contentMax === "landing"
      ? "w-full max-w-[var(--q-landing-inner-max)] sm:max-w-[var(--q-landing-inner-max)]"
      : contentMax === "wide"
        ? "sm:max-w-[var(--q-shell-wide)]"
        : "sm:max-w-[var(--q-shell-max)]";

  return (
    <div
      className={`flex min-h-[100dvh] min-w-0 flex-col items-stretch sm:items-center sm:px-3 sm:py-4 ${className}`}
      data-app-variant={variant}
    >
      <div
        className={`relative flex min-h-[100dvh] min-w-0 w-full max-w-full flex-1 flex-col overflow-x-clip bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.06)] sm:min-h-[min(100dvh,920px)] ${innerMax} sm:rounded-[28px] sm:shadow-[var(--q-card-shadow)]`}
        data-app-shell
      >
        {header}
        <main
          className={`min-h-0 min-w-0 flex-1 overflow-x-clip px-4 pt-3 sm:px-5 ${mainPad} ${mainClassName}`.trim()}
        >
          {children}
        </main>
        {bottomNav}
      </div>
    </div>
  );
}
