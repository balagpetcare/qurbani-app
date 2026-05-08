"use client";

import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppHeader } from "@/components/ui/AppHeader";
import { BottomNav } from "@/components/ui/BottomNav";
import { doctorBottomNavItems } from "@/lib/doctor-nav";

import { DoctorBackIcon, doctorHeaderIconClass } from "./doctor-header-icons";
import type { DoctorBackPreset } from "./doctor-back-preset";

const pillIconClass = "size-4 shrink-0 opacity-95";

const MOBILE_TOP_PILLS: {
  href: string;
  label: string;
  matchPrefix: boolean;
  Icon: LucideIcon;
}[] = [
  { href: "/doctor", label: "ড্যাশবোর্ড", matchPrefix: false, Icon: LayoutDashboard },
  { href: "/doctor/finance", label: "ফিন্যান্স", matchPrefix: false, Icon: Banknote },
  { href: "/doctor/leads", label: "লিড তালিকা", matchPrefix: true, Icon: ClipboardList },
  { href: "/doctor/settings", label: "সেটিংস", matchPrefix: false, Icon: Settings },
];

function topPillActive(pathname: string, href: string, matchPrefix: boolean) {
  if (matchPrefix) return pathname === href || pathname.startsWith(`${href}/`);
  return pathname === href;
}

const DESKTOP_LINKS: {
  href: string;
  label: string;
  external?: boolean;
  Icon: LucideIcon;
}[] = [
  { href: "/doctor", label: "ড্যাশবোর্ড", Icon: LayoutDashboard },
  { href: "/doctor/finance", label: "ফিন্যান্স", Icon: Banknote },
  { href: "/doctor/leads", label: "লিড তালিকা", Icon: ClipboardList },
  { href: "/doctor/settings", label: "সেটিংস", Icon: Settings },
  { href: "/", label: "হোম", Icon: Home },
  { href: "/api/doctor/logout", label: "লগআউট", external: true, Icon: LogOut },
];

const deskLinkClass =
  "inline-flex min-h-[40px] items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white/95 ring-1 ring-white/20 transition hover:bg-white/15";

const pillBase =
  "inline-flex shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-semibold touch-manipulation ring-1 transition active:scale-[0.99]";

export type DoctorPortalChromeProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  /** Lucide preset for the back control when `backHref` is set */
  backPreset?: DoctorBackPreset;
  children: ReactNode;
};

export function DoctorPortalChrome({
  title,
  subtitle,
  backHref,
  backLabel,
  backPreset,
  children,
}: DoctorPortalChromeProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() ?? "";

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  const backLeadingIcon =
    backHref && backPreset ? <DoctorBackIcon preset={backPreset} /> : undefined;

  return (
    <div className="flex min-h-[100dvh] min-w-0 flex-col items-stretch sm:items-center sm:bg-q-canvas sm:px-3 sm:py-4">
      <div className="relative flex min-h-[100dvh] w-full max-w-[var(--q-shell-max)] flex-1 flex-col overflow-x-clip bg-white shadow-sm sm:min-h-[min(100dvh,920px)] sm:rounded-[28px] sm:shadow-[var(--q-card-shadow)]">
        <AppHeader
          title={title}
          subtitle={subtitle}
          variant="gradient"
          stackedTitleRow
          backHref={backHref}
          backLabel={backLabel}
          backLeadingIcon={backLeadingIcon}
          bottomSlot={
            <div className="lg:hidden border-t border-white/15 bg-black/10">
              <div className="touch-pan-x overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <nav
                  className="flex w-max min-w-full snap-x snap-mandatory scroll-pb-1 flex-nowrap items-stretch gap-2 overflow-x-auto scroll-smooth px-3 py-2.5 sm:px-4"
                  aria-label="দ্রুত নেভিগেশন"
                >
                  {MOBILE_TOP_PILLS.map((p) => {
                    const active = topPillActive(pathname, p.href, p.matchPrefix);
                    const Icon = p.Icon;
                    const cls = active
                      ? `${pillBase} bg-white text-emerald-900 shadow-sm ring-white/40`
                      : `${pillBase} bg-white/10 text-white ring-white/25 hover:bg-white/20`;
                    return (
                      <Link key={p.href} href={p.href} className={cls}>
                        <Icon className={pillIconClass} aria-hidden />
                        <span>{p.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          }
          actions={
            <>
              <nav
                className="hidden flex-nowrap items-center justify-end gap-1.5 lg:flex"
                aria-label="ডাক্তার ডেস্কটপ মেনু"
              >
                {DESKTOP_LINKS.map((l) => {
                  const Icon = l.Icon;
                  const inner = (
                    <>
                      <Icon className={doctorHeaderIconClass} aria-hidden />
                      <span className="whitespace-nowrap">{l.label}</span>
                    </>
                  );
                  return l.external ? (
                    <a key={l.href} href={l.href} className={deskLinkClass}>
                      {inner}
                    </a>
                  ) : (
                    <Link key={l.href} href={l.href} className={deskLinkClass}>
                      {inner}
                    </Link>
                  );
                })}
              </nav>
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/15 px-3 py-2 text-sm font-semibold text-white touch-manipulation hover:bg-white/25 lg:hidden"
                aria-expanded={menuOpen}
                aria-controls="doctor-drawer-menu"
                aria-label="মেনু"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="size-5 shrink-0 opacity-95" aria-hidden />
                <span className="hidden min-[360px]:inline" aria-hidden="true">
                  মেনু
                </span>
              </button>
            </>
          }
        />

        <div className="flex-1 overflow-x-clip px-4 pb-app-nav pt-3 sm:px-5">
          {children}
        </div>

        <BottomNav
          items={doctorBottomNavItems()}
          className="lg:hidden"
          pinUntil="lg"
        />

        {menuOpen ? (
          <div
            className="fixed inset-0 z-[100] lg:hidden"
            id="doctor-drawer-menu"
            role="dialog"
            aria-modal="true"
            aria-label="মেনু"
          >
            <button
              type="button"
              className="absolute inset-0 bg-zinc-950/55"
              aria-label="মেনু বন্ধ করুন"
              onClick={closeMenu}
            />
            <div className="absolute right-0 top-0 flex h-full w-[min(100vw,20.5rem)] flex-col overflow-hidden border-l border-emerald-900/35 bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-2 bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-700 px-4 py-3.5 text-white shadow-md">
                <span className="inline-flex min-w-0 items-center gap-2 text-sm font-bold tracking-tight">
                  <Menu className="size-[18px] shrink-0 opacity-90" aria-hidden />
                  <span className="truncate">মেনু</span>
                </span>
                <button
                  type="button"
                  className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl text-white hover:bg-white/15"
                  onClick={closeMenu}
                  aria-label="বন্ধ"
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    ×
                  </span>
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto bg-emerald-50/40 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {DESKTOP_LINKS.map((l) => {
                  const Icon = l.Icon;
                  const rowClass =
                    "flex min-h-[48px] items-center gap-3 rounded-xl px-3.5 py-3 text-base font-semibold text-emerald-950 touch-manipulation hover:bg-white active:bg-emerald-100/80";
                  const inner = (
                    <>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/90 text-emerald-900 shadow-sm ring-1 ring-emerald-900/10">
                        <Icon className="size-[18px]" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{l.label}</span>
                    </>
                  );
                  return l.external ? (
                    <a key={l.href} href={l.href} className={rowClass}>
                      {inner}
                    </a>
                  ) : (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={rowClass}
                      onClick={closeMenu}
                    >
                      {inner}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
