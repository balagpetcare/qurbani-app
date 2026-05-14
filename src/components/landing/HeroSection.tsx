import Link from "next/link";

import { TrackedOutboundAnchor } from "@/components/analytics/TrackedOutboundAnchor";
import {
  landingBtnHelpline,
  landingBtnPrimary,
  landingBtnSecondaryOutline,
  landingBtnWhatsapp,
} from "./landing-button-classes";
import {
  landingTelHref,
  landingWhatsAppHref,
  LANDING_REQUEST_PATH,
} from "./landing-contact";

const TRUST_BADGES = [
  "জরুরি সহায়তা",
  "এলাকাভিত্তিক ডাক্তার",
  "দ্রুত সাড়া",
];

export type HeroSectionProps = {
  /** Full title for screen readers & SEO (banner carries visual branding). */
  pageTitleSeo: string;
  heroSubtitle: string;
  phoneDigits: string;
  whatsAppDigits: string;
  leadFormEnabled: boolean;
  applicationsEnabled: boolean;
};

export function HeroSection({
  pageTitleSeo,
  heroSubtitle,
  phoneDigits,
  whatsAppDigits,
  leadFormEnabled,
  applicationsEnabled,
}: HeroSectionProps) {
  const telHref = landingTelHref(phoneDigits);
  const waHref = landingWhatsAppHref(whatsAppDigits);

  return (
    <section className="border-b border-emerald-100/70 bg-gradient-to-b from-[#eef5f1] to-white pb-8 pt-4 text-center sm:pb-10 sm:pt-6">
      <div className="mx-auto w-full min-w-0 max-w-3xl px-2 sm:px-3">
        <h1 className="sr-only">{pageTitleSeo}</h1>
        <p className="mx-auto max-w-2xl text-pretty text-lg font-semibold leading-snug tracking-tight text-emerald-950 sm:text-xl md:text-2xl">
          {heroSubtitle}
        </p>

        <ul className="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-2 sm:mt-6">
          {TRUST_BADGES.map((label) => (
            <li
              key={label}
              className="rounded-full border border-emerald-200/90 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 shadow-sm"
            >
              {label}
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-6 flex w-full min-w-0 max-w-md flex-col gap-3 sm:max-w-lg">
          {leadFormEnabled ? (
            <Link href={LANDING_REQUEST_PATH} className={`touch-manipulation ${landingBtnPrimary}`}>
              ডাক্তারের পরামর্শ নিন
            </Link>
          ) : (
            <span className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-center text-base font-semibold text-zinc-600">
              অনলাইন অনুরোধ ফর্ম সাময়িক বন্ধ
            </span>
          )}
          {applicationsEnabled ? (
            <Link
              href="/doctor/apply"
              className={`touch-manipulation ${landingBtnSecondaryOutline}`}
            >
              ডাক্তার হিসেবে যুক্ত হন
            </Link>
          ) : null}
          <Link
            href="/doctors"
            className="touch-manipulation text-base font-semibold text-emerald-800 underline-offset-2 hover:underline"
          >
            ডাক্তারদের তথ্য দেখুন →
          </Link>
        </div>

        <div className="mx-auto mt-6 flex w-full min-w-0 max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
          <TrackedOutboundAnchor
            href={telHref}
            tracking="tel"
            className={`touch-manipulation ${landingBtnHelpline}`}
          >
            হেল্পলাইনে কল করুন
          </TrackedOutboundAnchor>
          <TrackedOutboundAnchor
            href={waHref}
            tracking="whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            className={`touch-manipulation ${landingBtnWhatsapp}`}
          >
            WhatsApp সহায়তা
          </TrackedOutboundAnchor>
        </div>
        <p className="mx-auto mt-5 max-w-xl px-1 text-sm leading-relaxed text-zinc-600 sm:text-base">
          ডাক্তারের ব্যক্তিগত নম্বর বা ইমেইল এখানে দেখানো হয় না। ফর্ম পূরণ করলে নির্ধারিতভাবে যোগাযোগ করা
          হবে।
        </p>
      </div>
    </section>
  );
}
