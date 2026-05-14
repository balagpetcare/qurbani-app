import Link from "next/link";

import {
  landingBtnPrimaryOnDark,
  landingBtnSecondaryOnDark,
} from "@/components/landing/landing-button-classes";
import { landingTelHref, LANDING_REQUEST_PATH } from "@/components/landing/landing-contact";
import type { LandingPublicPayload } from "@/lib/site-settings";

type Props = {
  lp: Pick<LandingPublicPayload, "leadFormEnabled" | "emergencyDigits">;
};

export function HomeFinalCtaSection({ lp }: Props) {
  const telEmergency = landingTelHref(lp.emergencyDigits);

  return (
    <section className="bg-gradient-to-br from-emerald-800 via-q-primary to-emerald-900 py-8 text-white sm:py-10">
      <div className="mx-auto w-full max-w-lg px-3 text-center sm:px-4">
        <h2 className="text-balance text-xl font-bold leading-snug sm:text-2xl">এখনই চিকিৎসার জন্য অনুরোধ করুন</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-emerald-100 sm:text-base">
          অভিজ্ঞ ডাক্তার দ্রুত যোগাযোগ করবেন।
        </p>
        <div className="mx-auto mt-6 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:justify-center">
          {lp.leadFormEnabled ? (
            <Link href={LANDING_REQUEST_PATH} className={`min-h-[48px] sm:max-w-[14rem] ${landingBtnPrimaryOnDark}`}>
              চিকিৎসার অনুরোধ
            </Link>
          ) : (
            <span className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-white/30 bg-white/10 px-4 text-sm font-semibold text-emerald-50">
              অনুরোধ ফর্ম সাময়িক বন্ধ
            </span>
          )}
          <a href={telEmergency} className={`min-h-[48px] sm:max-w-[14rem] ${landingBtnSecondaryOnDark}`}>
            জরুরি কল
          </a>
        </div>
      </div>
    </section>
  );
}
