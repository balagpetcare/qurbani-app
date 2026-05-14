import type { Metadata } from "next";
import Link from "next/link";

import { LandingAnalyticsScripts } from "@/components/landing/LandingAnalyticsScripts";
import {
  MaintenanceModeMessage,
  PublicSiteDisabledMessage,
} from "@/components/landing/PublicSiteMessages";
import { SimpleRequestForm } from "@/components/landing/SimpleRequestForm";
import { AppHeader } from "@/components/ui/AppHeader";
import { AppShell } from "@/components/ui/AppShell";
import { BottomNav } from "@/components/ui/BottomNav";
import { customerBottomNav } from "@/lib/customer-nav";
import { getLandingAreas } from "@/lib/landing-public-data";
import { getLandingPublicPayloadSafe } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const p = await getLandingPublicPayloadSafe();
  return {
    title: `ভেটেরিনারি সহায়তা · ${p.publicSiteTitle}`,
    description:
      "অল্প তথ্যে ভেটেরিনারি সহায়তার অনুরোধ — দ্রুত ও নিরাপদ।",
  };
}

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const lp = await getLandingPublicPayloadSafe();

  if (!lp.publicSiteEnabled) {
    return <PublicSiteDisabledMessage />;
  }
  if (lp.maintenanceMode) {
    return <MaintenanceModeMessage />;
  }

  const sp = await searchParams;
  const areaRaw = Array.isArray(sp.area) ? sp.area[0] : sp.area;
  const areaNum = areaRaw ? parseInt(areaRaw, 10) : NaN;
  const prefillAreaId =
    !Number.isNaN(areaNum) && areaNum > 0 ? areaNum : undefined;

  let areasFromDb: Awaited<ReturnType<typeof getLandingAreas>> = [];
  try {
    areasFromDb = await getLandingAreas();
  } catch {
    areasFromDb = [];
  }

  return (
    <AppShell
      variant="customer"
      header={
        <AppHeader
          title="ভেটেরিনারি সহায়তা"
          subtitle="অল্প তথ্য দিন — ডাক্তার দ্রুত যোগাযোগ করবেন"
          backHref="/"
          backLabel="হোম"
          variant="gradient"
          stackedTitleRow
          actions={
            <Link
              href="/doctors"
              className="rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/30 touch-manipulation hover:bg-white/25"
            >
              ডাক্তার
            </Link>
          }
        />
      }
      bottomNav={<BottomNav items={customerBottomNav(lp.phoneCallDigits)} />}
      mainClassName="[scroll-padding-bottom:max(6rem,env(safe-area-inset-bottom,0px))]"
    >
      <LandingAnalyticsScripts
        facebookPixelId={lp.facebookPixelId}
        googleAnalyticsId={lp.googleAnalyticsId}
      />

      <SimpleRequestForm
        key={prefillAreaId ?? "default"}
        initialAreas={areasFromDb}
        leadFormEnabled={lp.leadFormEnabled}
        emergencyLeadEnabled={lp.emergencyLeadEnabled}
        phoneDigits={lp.phoneCallDigits}
        whatsAppDigits={lp.whatsappDigits}
        prefillAreaId={prefillAreaId}
      />
    </AppShell>
  );
}
