import type { Metadata } from "next";
import Link from "next/link";

import { CaseShowcaseSection } from "@/components/landing/CaseShowcaseSection";
import { DoctorPreviewSection } from "@/components/landing/DoctorPreviewSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { LandingAnalyticsScripts } from "@/components/landing/LandingAnalyticsScripts";
import { LandingBenefitsSection } from "@/components/landing/LandingBenefitsSection";
import { LandingFinalCtaSection } from "@/components/landing/LandingFinalCtaSection";
import { LandingHeroBanner } from "@/components/landing/LandingHeroBanner";
import { LandingMobileStickyCta } from "@/components/landing/LandingMobileStickyCta";
import { LandingQuickAreaSection } from "@/components/landing/LandingQuickAreaSection";
import {
  MaintenanceModeMessage,
  PublicSiteDisabledMessage,
} from "@/components/landing/PublicSiteMessages";
import { landingTelHref } from "@/components/landing/landing-contact";
import {
  landingCallNumberDisplay,
  landingWhatsAppNumberDisplay,
} from "@/lib/public-contact";
import { AppShell } from "@/components/ui/AppShell";
import { BottomNav } from "@/components/ui/BottomNav";
import { customerBottomNav } from "@/lib/customer-nav";
import {
  getDoctorPreviews,
  getLandingAreas,
  getPublicShowcaseCases,
  type PublicShowcaseCase,
} from "@/lib/landing-public-data";
import { getLandingPublicPayloadSafe } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const DEFAULT_HERO_SUB =
  "ঢাকা ও পার্শ্ববর্তী এলাকায় আপনার কাছের ডাক্তারদের মাধ্যমে হোম ভিজিট ও জরুরি ভেটেরিনারি সহায়তা।";

export async function generateMetadata(): Promise<Metadata> {
  const p = await getLandingPublicPayloadSafe();
  return {
    title: p.seoPageTitle,
    description: p.seoMetaDescription.trim() ? p.seoMetaDescription : undefined,
  };
}

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
  let doctorPreviews: Awaited<ReturnType<typeof getDoctorPreviews>> = [];

  try {
    [areasFromDb, doctorPreviews, showcaseCases] = await Promise.all([
      getLandingAreas(),
      getDoctorPreviews(4),
      getPublicShowcaseCases(6),
    ]);
  } catch {
    areasFromDb = [];
    doctorPreviews = [];
    showcaseCases = [];
  }

  const telMain = landingTelHref(lp.phoneCallDigits);
  const telEmergency = landingTelHref(lp.emergencyDigits);

  const heroSubtitle = lp.heroSubtitle.trim() || DEFAULT_HERO_SUB;

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

      <div className="space-y-0 pb-6">
        <HeroSection
          pageTitleSeo="কোরবানির পশুর জরুরি ও দ্রুত চিকিৎসা সহায়তা — Qurbani 2026"
          heroSubtitle={heroSubtitle}
          phoneDigits={lp.phoneCallDigits}
          whatsAppDigits={lp.whatsappDigits}
          leadFormEnabled={lp.leadFormEnabled}
          applicationsEnabled={lp.applicationsEnabled}
        />

        <LandingQuickAreaSection areas={areasFromDb} leadFormEnabled={lp.leadFormEnabled} />

        <LandingBenefitsSection />

        <DoctorPreviewSection doctors={doctorPreviews} />

        <HowItWorksSection />

        <CaseShowcaseSection cases={showcaseCases} />

        <FaqSection />

        <LandingFinalCtaSection
          leadFormEnabled={lp.leadFormEnabled}
          applicationsEnabled={lp.applicationsEnabled}
        />
      </div>

      <footer className="mt-6 border-t border-emerald-200/60 bg-white/90 px-4 py-8 text-center text-sm text-q-muted sm:rounded-b-[28px] sm:px-6 sm:py-10">
        <p className="text-base font-semibold text-zinc-900 sm:text-lg">{lp.publicSiteTitle}</p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-600 sm:text-base">
          কুরবানি ২০২৬ · ভেটেরিনারি সহায়তা
        </p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-600 sm:text-base">
          জরুরি প্রয়োজনে কল বা WhatsApp করুন
        </p>
        <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-relaxed text-zinc-800 sm:text-base">
          কল: {landingCallNumberDisplay(lp.phoneCallDigits)}
          <span className="mx-2 text-zinc-400" aria-hidden>
            ·
          </span>
          WhatsApp: {landingWhatsAppNumberDisplay(lp.whatsappDigits)}
        </p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-600 sm:text-base">
          গ্রাহকের তথ্য নিরাপদ রাখা হয়
        </p>
        {lp.address.trim() ? (
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-600 sm:text-base">
            {lp.address}
          </p>
        ) : null}
        <div className="mx-auto mt-5 flex max-w-lg flex-wrap justify-center gap-x-5 gap-y-3 text-sm sm:text-base">
          <a href={telMain} className="font-medium text-q-primary underline">
            কল (প্রধান)
          </a>
          <a href={telEmergency} className="font-medium text-q-primary underline">
            জরুরি লাইন
          </a>
          {lp.email.trim() ? (
            <a
              href={`mailto:${encodeURIComponent(lp.email.trim())}`}
              className="font-medium text-q-primary underline break-all"
            >
              ইমেইল
            </a>
          ) : null}
          {lp.facebookUrl.trim() ? (
            <a
              href={lp.facebookUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-q-primary underline"
            >
              Facebook
            </a>
          ) : null}
          {lp.messengerUrl.trim() ? (
            <a
              href={lp.messengerUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-q-primary underline"
            >
              Messenger
            </a>
          ) : null}
          {lp.googleMapsUrl.trim() ? (
            <a
              href={lp.googleMapsUrl.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-q-primary underline"
            >
              মানচিত্র
            </a>
          ) : null}
          <Link href="/admin" className="font-medium text-zinc-400 underline hover:text-zinc-600">
            অ্যাডমিন
          </Link>
        </div>
        <p className="mt-5 text-sm text-zinc-600 sm:text-base">
          {lp.applicationsEnabled ? (
            <a
              href="/doctor/apply"
              className="font-medium text-q-primary underline underline-offset-2"
            >
              ডাক্তার হিসেবে আবেদন করুন
            </a>
          ) : (
            <span className="text-zinc-500">ডাক্তার আবেদন ফর্ম এখন বন্ধ আছে।</span>
          )}
          {" · "}
          <Link href="/track" className="font-medium text-q-primary underline">
            আবেদনের খোঁজ রাখুন
          </Link>
        </p>
      </footer>
    </AppShell>
  );
}
