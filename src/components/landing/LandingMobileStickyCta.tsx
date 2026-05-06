"use client";

import Link from "next/link";

import { landingStickyBtnPrimary, landingStickyBtnSecondary } from "./landing-button-classes";
import { LANDING_REQUEST_PATH } from "./landing-contact";

type Props = {
  leadFormEnabled: boolean;
  applicationsEnabled: boolean;
};

/**
 * Mobile-only floating CTAs above the bottom nav — platform helpline only in hero/footer, not doctor numbers.
 * Two equal columns when both actions are shown; single full-width row when one is hidden.
 */
export function LandingMobileStickyCta({ leadFormEnabled, applicationsEnabled }: Props) {
  if (!leadFormEnabled && !applicationsEnabled) return null;

  const both = leadFormEnabled && applicationsEnabled;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 px-3 pb-[env(safe-area-inset-bottom,0px)] md:hidden"
      style={{
        bottom: "max(5.25rem, calc(4.25rem + env(safe-area-inset-bottom, 0px)))",
      }}
    >
      <div
        className={`pointer-events-auto mx-auto w-full min-w-0 max-w-[var(--q-landing-inner-max)] gap-2 rounded-2xl border border-emerald-200/95 bg-white/96 p-2.5 shadow-[0_-6px_28px_rgba(15,23,42,0.14)] backdrop-blur-md sm:gap-3 ${
          both ? "grid grid-cols-2" : "flex flex-col"
        }`}
      >
        {leadFormEnabled ? (
          <Link href={LANDING_REQUEST_PATH} className={landingStickyBtnPrimary}>
            ডাক্তারের পরামর্শ নিন
          </Link>
        ) : null}
        {applicationsEnabled ? (
          <Link href="/doctor/apply" className={landingStickyBtnSecondary}>
            ডাক্তার হিসেবে যুক্ত হন
          </Link>
        ) : null}
      </div>
    </div>
  );
}
