import { redirect } from "next/navigation";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminSettingsForm } from "@/components/admin/AdminSettingsForm";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { getMainAdminOnlyUser } from "@/lib/admin-server-session";
import { loadMergedSiteSettingsForAdmin } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await getMainAdminOnlyUser();
  if (!admin) {
    redirect("/admin");
  }

  const rows = await loadMergedSiteSettingsForAdmin();

  return (
    <AdminAppShell>
      <AdminNav
        title="সেটিংস"
        subtitle="ওয়েবসাইট, যোগাযোগ, লিড ও নোটিফিকেশন — শুধু মূল অ্যাডমিন"
      />

      <AdminMain variant="narrow" className="space-y-6">
        <AdminSettingsForm initialRows={rows} />
      </AdminMain>
    </AdminAppShell>
  );
}
