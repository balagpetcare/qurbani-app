"use client";

import { Banknote, ClipboardList, LayoutDashboard, Settings } from "lucide-react";

import type { BottomNavItem } from "@/components/ui/BottomNav";

const ic = "size-[1.15rem] shrink-0";

/** Sticky bottom navigation for logged-in doctor portal (mobile). */
export function doctorBottomNavItems(): BottomNavItem[] {
  return [
    {
      href: "/doctor",
      label: "ড্যাশবোর্ড",
      icon: <LayoutDashboard className={ic} aria-hidden />,
    },
    {
      href: "/doctor/finance",
      label: "ফিন্যান্স",
      icon: <Banknote className={ic} aria-hidden />,
    },
    {
      href: "/doctor/leads",
      label: "লিড",
      icon: <ClipboardList className={ic} aria-hidden />,
      matchPrefix: true,
    },
    {
      href: "/doctor/settings",
      label: "সেটিংস",
      icon: <Settings className={ic} aria-hidden />,
    },
  ];
}
