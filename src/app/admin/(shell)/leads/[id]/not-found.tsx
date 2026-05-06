import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import { AdminMain } from "@/components/admin/ui/AdminMain";
import { ADMIN_REQUESTS_PATH } from "@/lib/admin-routes";

export default function AdminLeadNotFound() {
  return (
    <AdminAppShell>
      <AdminNav title="লিড" subtitle="খুঁজে পাওয়া যায়নি" />
      <AdminMain className="space-y-6">
        <AdminEmptyState
          title="লিড পাওয়া যায়নি"
          description="এই আইডির কোনো লিড নেই, অথবা মুছে ফেলা হয়েছে।"
          action={
            <Link
              href={ADMIN_REQUESTS_PATH}
              className="inline-flex min-h-[48px] w-full min-w-0 max-w-sm items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              অনুরোধ তালিকায় ফিরুন
            </Link>
          }
        />
      </AdminMain>
    </AdminAppShell>
  );
}
