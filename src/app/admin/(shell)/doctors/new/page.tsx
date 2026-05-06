import Link from "next/link";

import { DoctorForm } from "@/components/admin/DoctorForm";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminMain } from "@/components/admin/ui/AdminMain";

export default async function NewDoctorPage() {
  return (
    <AdminAppShell>
      <AdminNav title="নতুন ডাক্তার" narrow />

      <AdminMain variant="narrow" className="space-y-6">
        <Link
          href="/admin/doctors"
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          ← ডাক্তার তালিকা
        </Link>
        <DoctorForm />
      </AdminMain>
    </AdminAppShell>
  );
}
