"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminTopNav, adminNavActive, type AdminTopNavItem } from "@/components/admin/ui/AdminTopNav";
import { APP_HEADER_GRADIENT_CLASS } from "@/components/ui/AppHeader";

type Props = {
  title: string;
  subtitle?: string;
  narrow?: boolean;
  showSettingsLink: boolean;
};

export function AdminNavBar({
  title,
  subtitle,
  narrow,
  showSettingsLink,
}: Props) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);

  const items: AdminTopNavItem[] = [
    { href: "/admin", label: "ড্যাশবোর্ড" },
    { href: "/admin/requests", label: "অনুরোধ ও লিড" },
    { href: "/admin/doctors", label: "ডাক্তার" },
    { href: "/admin/doctor-applications", label: "ডাক্তার আবেদন" },
    { href: "/admin/areas", label: "এলাকা ব্যবস্থাপনা" },
    { href: "/admin/reports", label: "রিপোর্ট" },
    { href: "/admin/doctor-finance", label: "ডাক্তার ফিন্যান্স" },
    { href: "/admin/notifications", label: "নোটিফিকেশন" },
  ];
  if (showSettingsLink) {
    items.push({ href: "/admin/settings", label: "সেটিংস" });
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function closeDrawer() {
    setOpen(false);
  }

  function drawerLinkClass(href: string): string {
    const active = adminNavActive(pathname, href);
    const base =
      "rounded-xl px-4 py-3 text-base font-medium touch-manipulation transition-colors min-h-[48px] flex items-center";
    if (href === "/admin/settings") {
      return active
        ? `${base} bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300/60`
        : `${base} text-emerald-900 hover:bg-emerald-50`;
    }
    if (href === "/") {
      return `${base} text-emerald-800 hover:bg-emerald-50`;
    }
    if (href.includes("logout")) {
      return `${base} text-zinc-600 hover:bg-zinc-100`;
    }
    return active
      ? `${base} bg-zinc-900 text-white`
      : `${base} text-zinc-700 hover:bg-zinc-100`;
  }

  return (
    <>
      <header className="sticky top-0 z-30 pt-app-header">
        <div
          className={`${APP_HEADER_GRADIENT_CLASS} text-white shadow-[0_10px_40px_-18px_rgba(6,78,59,0.45)]`}
        >
          <div className="px-4 pb-3 pt-3.5 sm:px-5 sm:pb-3.5 sm:pt-4">
            <AdminPageHeader
              title={title}
              subtitle={subtitle ?? "কুরবানি ২০২৬ · অ্যাডমিন"}
              compact={narrow}
              trailing={
                <>
                  <div className="hidden items-center gap-1.5 lg:flex">
                    <Link
                      href="/"
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white touch-manipulation hover:bg-white/20"
                    >
                      হোম
                    </Link>
                    <a
                      href="/api/admin/logout"
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/30 bg-white/10 px-3 text-xs font-semibold text-white touch-manipulation hover:bg-white/20"
                    >
                      লগআউট
                    </a>
                  </div>
                  <button
                    type="button"
                    className="inline-flex min-h-[var(--q-touch-min)] shrink-0 items-center justify-center rounded-2xl border border-white/35 bg-white/15 px-4 text-sm font-semibold text-white touch-manipulation hover:bg-white/25 lg:hidden"
                    aria-expanded={open}
                    aria-controls="admin-mobile-nav"
                    onClick={() => setOpen((v) => !v)}
                  >
                    মেনু
                  </button>
                </>
              }
            />
          </div>
          <AdminTopNav items={items} />
        </div>
      </header>

      {open ? (
        <div
          className="fixed inset-0 z-[100] lg:hidden"
          id="admin-mobile-nav"
          role="dialog"
          aria-modal="true"
          aria-label="মেনু"
        >
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/55"
            aria-label="মেনু বন্ধ করুন"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100vw,20rem)] flex-col overflow-hidden border-l border-emerald-900/40 bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700 px-4 py-3.5 text-white shadow-md">
              <span className="text-sm font-bold tracking-tight">মেনু</span>
              <button
                type="button"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-xl text-white/90 hover:bg-white/15"
                onClick={() => setOpen(false)}
                aria-label="বন্ধ"
              >
                ×
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={drawerLinkClass(item.href)}
                  onClick={closeDrawer}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/" className={drawerLinkClass("/")} onClick={closeDrawer}>
                হোম
              </Link>
              <a href="/api/admin/logout" className={drawerLinkClass("/api/admin/logout")}>
                লগআউট
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
