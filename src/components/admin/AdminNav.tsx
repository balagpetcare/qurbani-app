import { UserRole } from "@/generated/prisma/enums";
import { getAdminPortalUser } from "@/lib/admin-server-session";
import { getAdminNotice } from "@/lib/site-settings";

import { AdminNavBar } from "./AdminNavBar";

type Props = {
  title: string;
  subtitle?: string;
  /** Narrow inner container (e.g. lead detail). Default matches wide admin pages. */
  narrow?: boolean;
};

export async function AdminNav({ title, subtitle, narrow }: Props) {
  const user = await getAdminPortalUser();
  const notice = await getAdminNotice();

  return (
    <>
      {notice.trim() ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs leading-relaxed text-amber-950 sm:text-sm">
          <span className="font-semibold">নোটিশ:</span> {notice.trim()}
        </div>
      ) : null}
      <AdminNavBar
        title={title}
        subtitle={subtitle}
        narrow={Boolean(narrow)}
        showSettingsLink={user?.role === UserRole.ADMIN}
      />
    </>
  );
}
