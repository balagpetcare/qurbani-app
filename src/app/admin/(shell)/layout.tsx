import type { ReactNode } from "react";

import { BottomNav } from "@/components/ui/BottomNav";
import { adminBottomNavItems } from "@/lib/admin-nav";

/** Logged-in admin portal: centered shell + mobile bottom nav. Login stays outside this group. */
export default function AdminShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] min-w-0 flex-col items-stretch sm:items-center sm:bg-q-canvas sm:px-3 sm:py-4">
      <div className="relative flex min-h-[100dvh] w-full max-w-[var(--q-shell-max)] flex-1 flex-col overflow-x-clip bg-white shadow-sm sm:min-h-[min(100dvh,920px)] sm:rounded-[28px] sm:shadow-[var(--q-card-shadow)]">
        {children}
        <BottomNav
          items={adminBottomNavItems()}
          className="lg:hidden"
          pinUntil="lg"
        />
      </div>
    </div>
  );
}
