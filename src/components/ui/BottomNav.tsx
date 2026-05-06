"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export type BottomNavItem = {
  href: string;
  label: string;
  /** Emoji / short text, or a Lucide element for richer doctor nav */
  icon?: string | ReactNode;
  matchPrefix?: boolean;
};

function isActive(pathname: string, href: string, matchPrefix?: boolean) {
  if (href.startsWith("tel:") || href.startsWith("http")) return false;
  if (matchPrefix) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ icon }: { icon: string | ReactNode }) {
  if (typeof icon === "string") {
    return (
      <span className="text-base leading-none" aria-hidden>
        {icon}
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center justify-center text-emerald-900/90 [&_svg]:shrink-0">
      {icon}
    </span>
  );
}

function NavInner({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon?: string | ReactNode;
  active: boolean;
}) {
  const cls = `flex min-h-[var(--q-touch-min)] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-xs font-semibold touch-manipulation transition-colors ${
    active
      ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/70"
      : "text-q-muted hover:bg-zinc-50 hover:text-zinc-800"
  }`;
  const inner = (
    <>
      {icon ? <NavIcon icon={icon} /> : null}
      <span className="max-w-full truncate text-[11px] leading-tight sm:text-xs">
        {label}
      </span>
    </>
  );
  if (href.startsWith("tel:") || href.startsWith("http")) {
    return (
      <a
        href={href}
        className={cls}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {inner}
      </a>
    );
  }
  // Route handlers under /api must not use next/link: in production, Link prefetches
  // viewport links and a GET /api/.../logout would clear the session without a tap.
  if (href.startsWith("/api/")) {
    return (
      <a href={href} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

type Props = {
  items: BottomNavItem[];
  className?: string;
  /**
   * Viewport-pin the bar for smaller breakpoints. Use `lg` for doctor/admin shells
   * (nav hidden from `lg:` up) so tablets never rely on in-flow sticky placement.
   * @default "sm"
   */
  pinUntil?: "sm" | "lg";
};

export function BottomNav({ items, className = "", pinUntil = "sm" }: Props) {
  const pathname = usePathname() ?? "";

  const pinClasses =
    pinUntil === "lg"
      ? "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-[90]"
      : "max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 sm:sticky sm:bottom-0 sm:rounded-b-[28px] z-40";

  return (
    <nav
      className={`border-t border-[var(--q-border)] bg-white/95 shadow-[0_-6px_28px_-14px_rgba(15,23,42,0.14)] backdrop-blur-md backdrop-saturate-150 ${pinClasses} ${className}`}
      style={{
        paddingBottom: "max(0.65rem, env(safe-area-inset-bottom))",
      }}
      aria-label="প্রধান মেনু"
    >
      <div className="mx-auto flex max-w-[var(--q-shell-max)] min-h-[var(--q-touch-min)] items-stretch justify-around gap-1 px-2 pt-2">
        {items.map((item) => {
          const active = isActive(pathname, item.href, item.matchPrefix);
          return (
            <NavInner
              key={item.href + item.label}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={active}
            />
          );
        })}
      </div>
    </nav>
  );
}
