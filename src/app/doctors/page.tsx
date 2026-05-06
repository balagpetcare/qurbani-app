import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";

import { AppCard } from "@/components/ui/AppCard";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppSearchInput } from "@/components/ui/AppSearchInput";
import { AppSection } from "@/components/ui/AppSection";
import { AppShell } from "@/components/ui/AppShell";
import { AppSelect } from "@/components/ui/AppSelect";
import { AppDoctorCard } from "@/components/ui/AppDoctorCard";
import { BottomNav } from "@/components/ui/BottomNav";
import { customerBottomNav } from "@/lib/customer-nav";
import { getLandingAreas, getPublicDoctorDirectory } from "@/lib/landing-public-data";
import { getLandingPublicPayloadSafe } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return s.trim() || undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const p = await getLandingPublicPayloadSafe();
  return { title: `ডাক্তার তালিকা · ${p.publicSiteTitle}` };
}

export default async function DoctorsDirectoryPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = first(sp.q);
  const areaRaw = first(sp.area);
  const areaId =
    areaRaw && !Number.isNaN(parseInt(areaRaw, 10))
      ? parseInt(areaRaw, 10)
      : undefined;

  const lp = await getLandingPublicPayloadSafe();
  const [areas, doctors] = await Promise.all([
    getLandingAreas(),
    getPublicDoctorDirectory({
      search: q,
      areaId: areaId && areaId > 0 ? areaId : undefined,
      limit: 100,
    }),
  ]);

  return (
    <AppShell
      variant="customer"
      contentMax="wide"
      header={
        <AppHeader
          title="ডাক্তার খুঁজুন"
          subtitle="নাম বা এলাকা দিয়ে ফিল্টার করুন"
          backHref="/"
          variant="gradient"
        />
      }
      bottomNav={<BottomNav items={customerBottomNav(lp.phoneCallDigits)} />}
    >
      <form className="flex flex-col gap-3" method="get" action="/doctors">
        <AppSearchInput
          name="q"
          type="search"
          defaultValue={q ?? ""}
          placeholder="নামে খুঁজুন…"
          enterKeyHint="search"
          aria-label="নামে খুঁজুন"
        />
        <AppFieldSimple label="এলাকা">
          <AppSelect name="area" defaultValue={areaId ? String(areaId) : ""}>
            <option value="">সব এলাকা</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nameBn ?? a.name}
              </option>
            ))}
          </AppSelect>
        </AppFieldSimple>
        <button
          type="submit"
          className="min-h-[var(--q-touch-min)] rounded-2xl bg-q-primary font-bold text-white shadow-md touch-manipulation active:opacity-95"
        >
          ফিল্টার করুন
        </button>
      </form>

      <AppSection title="ডাক্তারগণ" className="mt-8">
        <div className="flex flex-col gap-4">
          {doctors.length === 0 ? (
            <AppCard variant="inset">
              <p className="text-center text-sm text-q-muted">কোনো ডাক্তার পাওয়া যায়নি।</p>
            </AppCard>
          ) : (
            doctors.map((d) => (
              <AppDoctorCard
                key={d.id}
                doctor={d}
                detailHref={`/doctors/${d.id}`}
                detailLabel="বিস্তারিত দেখুন"
              />
            ))
          )}
        </div>
      </AppSection>

      <p className="mt-8 text-center text-xs text-q-muted">
        <Link href="/request" className="font-semibold text-q-primary underline">
          চিকিৎসার অনুরোধ করুন
        </Link>
      </p>
    </AppShell>
  );
}

function AppFieldSimple({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="text-sm font-semibold text-zinc-800">{label}</span>
      {children}
    </label>
  );
}
