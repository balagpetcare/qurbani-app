import type { BottomNavItem } from "@/components/ui/BottomNav";

/** Sticky bottom navigation for the admin portal (mobile). */
export function adminBottomNavItems(): BottomNavItem[] {
  return [
    { href: "/admin", label: "ড্যাশবোর্ড", icon: "▣" },
    { href: "/admin/requests", label: "লিড", icon: "📋", matchPrefix: true },
    { href: "/admin/doctors", label: "ডাক্তার", icon: "🩺" },
    { href: "/admin/reports", label: "রিপোর্ট", icon: "📊" },
    { href: "/admin/more", label: "আরও", icon: "⋯" },
  ];
}
