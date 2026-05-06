import type { BottomNavItem } from "@/components/ui/BottomNav";
import { landingTelHref } from "@/components/landing/landing-contact";

export function customerBottomNav(phoneCallDigits: string): BottomNavItem[] {
  return [
    { href: "/", label: "হোম", icon: "🏠" },
    { href: "/doctors", label: "ডাক্তার", icon: "🩺" },
    { href: "/request", label: "অনুরোধ", icon: "📝" },
    { href: landingTelHref(phoneCallDigits), label: "কল", icon: "📞" },
  ];
}
