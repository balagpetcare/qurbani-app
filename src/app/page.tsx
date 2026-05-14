import type { Metadata } from "next";

import { LandingAnalyticsScripts } from "@/components/landing/LandingAnalyticsScripts";
import { LandingHeroBanner } from "@/components/landing/LandingHeroBanner";
import { LandingMobileStickyCta } from "@/components/landing/LandingMobileStickyCta";
import { HomeAreaSearchSection } from "@/components/landing/home/HomeAreaSearchSection";
import { HomeFaqSection } from "@/components/landing/home/HomeFaqSection";
import { HomeFeaturedDoctorsSection } from "@/components/landing/home/HomeFeaturedDoctorsSection";
import { HomeFinalCtaSection } from "@/components/landing/home/HomeFinalCtaSection";
import { HomeHowItWorksSection } from "@/components/landing/home/HomeHowItWorksSection";
import { HomeLiveActivitySection } from "@/components/landing/home/HomeLiveActivitySection";
import { HomeLiveStatsSection } from "@/components/landing/home/HomeLiveStatsSection";
import { HomeQuickRequestCta } from "@/components/landing/home/HomeQuickRequestCta";
import { HomeReviewsSection } from "@/components/landing/home/HomeReviewsSection";
import { HomeSiteFooter } from "@/components/landing/home/HomeSiteFooter";
import {
  MaintenanceModeMessage,
  PublicSiteDisabledMessage,
} from "@/components/landing/PublicSiteMessages";
import { AppShell } from "@/components/ui/AppShell";
import { BottomNav } from "@/components/ui/BottomNav";
import { customerBottomNav } from "@/lib/customer-nav";
import {
  getDoctorPreviews,
  getLandingAreas,
  getLandingHomeStats,
  getPublicShowcaseCases,
  type LandingHomeStats,
  type PublicShowcaseCase,
} from "@/lib/landing-public-data";
import type { PublicDoctorCard } from "@/lib/public-doctor";
import { getLandingPublicPayloadSafe } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const p = await getLandingPublicPayloadSafe();
  return {
    title: p.seoPageTitle,
    description: p.seoMetaDescription.trim() ? p.seoMetaDescription : undefined,
  };
}

const EMPTY_STATS: LandingHomeStats = {
  doctorCount: 0,
  activeTreatments: 0,
  todayRequests: 0,
  completedServices: 0,
  visitsScheduledToday: 0,
};

export default async function Home() {
  const lp = await getLandingPublicPayloadSafe();

  if (!lp.publicSiteEnabled) {
    return <PublicSiteDisabledMessage />;
  }
  if (lp.maintenanceMode) {
    return <MaintenanceModeMessage />;
  }

  let areasFromDb: Awaited<ReturnType<typeof getLandingAreas>> = [];
  let showcaseCases: PublicShowcaseCase[] = [];
  let doctorPreviews: PublicDoctorCard[] = [];
  let homeStats: LandingHomeStats = EMPTY_STATS;

  try {
    [areasFromDb, doctorPreviews, showcaseCases, homeStats] = await Promise.all([
      getLandingAreas(),
      getDoctorPreviews(48, { cardMode: "directory" }),
      getPublicShowcaseCases(8),
      getLandingHomeStats(),
    ]);
  } catch {
    areasFromDb = await getLandingAreas().catch(() => []);
    doctorPreviews = [];
    showcaseCases = [];
    homeStats = EMPTY_STATS;
  }

  return (
    <AppShell
      variant="customer"
      contentMax="landing"
      className="bg-[var(--q-landing-canvas)]"
      mainClassName="!pt-0 !pb-[calc(9.25rem+env(safe-area-inset-bottom,0px))] md:!pb-app-nav"
      bottomNav={<BottomNav items={customerBottomNav(lp.phoneCallDigits)} />}
    >
      <LandingAnalyticsScripts
        facebookPixelId={lp.facebookPixelId}
        googleAnalyticsId={lp.googleAnalyticsId}
      />

      <LandingMobileStickyCta
        leadFormEnabled={lp.leadFormEnabled}
        applicationsEnabled={lp.applicationsEnabled}
      />

      <LandingHeroBanner />

      <div className="space-y-0 pb-4">
        <HomeQuickRequestCta lp={lp} />
        <HomeAreaSearchSection areas={areasFromDb} leadFormEnabled={lp.leadFormEnabled} />
        <HomeLiveStatsSection stats={homeStats} />
        <HomeFeaturedDoctorsSection
          doctors={doctorPreviews}
          areas={areasFromDb}
          leadFormEnabled={lp.leadFormEnabled}
        />
        <HomeHowItWorksSection />
        <HomeReviewsSection cases={showcaseCases} />
        <HomeLiveActivitySection stats={homeStats} />
        <HomeFaqSection />
        <HomeFinalCtaSection lp={lp} />
      </div>

      <HomeSiteFooter lp={lp} areas={areasFromDb} />
    </AppShell>
  );
}
