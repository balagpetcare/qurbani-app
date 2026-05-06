"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminTopNavItem = { href: string; label: string };

export function adminNavActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/requests") {
    return (
      pathname.startsWith("/admin/requests") || pathname.startsWith("/admin/leads")
    );
  }
  if (href === "/admin/more") {
    return (
      pathname === "/admin/more" ||
      pathname.startsWith("/admin/doctor-applications") ||
      pathname.startsWith("/admin/settings") ||
      pathname.startsWith("/admin/areas")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  items: AdminTopNavItem[];
};

/**
 * Horizontal primary nav for large screens — scrolls instead of wrapping into the title row.
 */
export function AdminTopNav({ items }: Props) {
  const pathname = usePathname() ?? "";

  return (
    <div className="border-t border-white/15 bg-black/10 px-2 py-2 sm:px-3 sm:py-2.5">
      <div className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <nav
          className="flex w-max max-w-full min-w-0 flex-nowrap items-center gap-1.5 px-1 pb-0.5"
          aria-label="অ্যাডমিন নেভিগেশন"
        >
          {items.map((item) => {
            const active = adminNavActive(pathname, item.href);
            const base =
              "inline-flex shrink-0 items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap touch-manipulation transition sm:py-2.5";
            const cls = active
              ? `${base} bg-white text-emerald-900 shadow-sm ring-1 ring-white/40`
              : `${base} bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20`;
            return (
              <Link key={item.href} href={item.href} className={cls}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
