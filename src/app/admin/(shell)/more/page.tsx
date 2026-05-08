import Link from "next/link";

import { AdminNav } from "@/components/admin/AdminNav";
import { AdminAppShell } from "@/components/admin/ui/AdminAppShell";
import { AdminCard } from "@/components/admin/ui/AdminCard";
import { AdminMain } from "@/components/admin/ui/AdminMain";

export const dynamic = "force-dynamic";

const links = [
  {
    href: "/admin/doctor-finance",
    label: "ডাক্তার ফিন্যান্স",
    desc: "সমাপ্ত বিল ও ডাক্তার অনুযায়ী আর্থিক রিপোর্ট",
  },
  {
    href: "/admin/moderation/case-histories",
    label: "পাবলিক কেস হিস্ট্রি",
    desc: "অনামীকৃত কেস শোকেস অনুমোদন",
  },
  { href: "/admin/doctor-applications", label: "ডাক্তার আবেদন", desc: "আবেদন পর্যালোচনা ও অনুমোদন" },
  { href: "/admin/areas", label: "এলাকা ব্যবস্থাপনা", desc: "সেবার এলাকা ও পরিসংখ্যান" },
  { href: "/admin/notifications", label: "নোটিফিকেশন", desc: "কিউ ও বার্তা" },
  { href: "/admin/settings", label: "সেটিংস", desc: "সাইট ও যোগাযোগ" },
] as const;

export default async function AdminMorePage() {
  return (
    <AdminAppShell>
      <AdminNav title="আরও মেনু" subtitle="দ্রুত লিঙ্ক" />
      <AdminMain variant="narrow" className="space-y-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="block touch-manipulation">
            <AdminCard className="transition-shadow hover:shadow-md">
              <p className="font-bold text-q-primary-deep">{l.label}</p>
              <p className="mt-1 text-sm text-q-muted">{l.desc}</p>
            </AdminCard>
          </Link>
        ))}
      </AdminMain>
    </AdminAppShell>
  );
}
