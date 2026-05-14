import Link from "next/link";

import { TrackedOutboundAnchor } from "@/components/analytics/TrackedOutboundAnchor";
import {
  landingBtnOutlineEmerald,
  landingBtnSolidEmerald,
} from "@/components/landing/landing-button-classes";
import { landingTelHref, LANDING_REQUEST_PATH } from "@/components/landing/landing-contact";
import type { LandingPublicPayload } from "@/lib/site-settings";

const PAGE_TITLE_SEO =
  "কোরবানির পশুর জরুরি ও দ্রুত চিকিৎসা সহায়তা — Qurbani 2026";

type Props = {
  lp: Pick<LandingPublicPayload, "leadFormEnabled" | "emergencyDigits">;
};

export function HomeQuickRequestCta({ lp }: Props) {
  const telEmergency = landingTelHref(lp.emergencyDigits);

  return (
    <section
      className="border-b border-emerald-100/70 bg-gradient-to-b from-white to-[#f0faf4] px-3 pb-5 pt-4 sm:px-4 sm:pb-6 sm:pt-5"
      aria-labelledby="home-quick-cta-title"
    >
      <h1 className="sr-only">{PAGE_TITLE_SEO}</h1>
      <div className="mx-auto w-full max-w-lg text-center">
        <p
          id="home-quick-cta-title"
          className="text-balance text-base font-semibold leading-snug text-emerald-950 sm:text-lg"
        >
          জরুরি চিকিৎসা বা পরামর্শ — এক ট্যাপে অনুরোধ করুন
        </p>
        <div className="mt-4 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:justify-center">
          {lp.leadFormEnabled ? (
            <Link
              href={LANDING_REQUEST_PATH}
              className={`min-h-[48px] flex-1 rounded-2xl text-[1.05rem] font-bold shadow-md sm:max-w-xs ${landingBtnSolidEmerald}`}
            >
              চিকিৎসার অনুরোধ দিন
            </Link>
          ) : (
            <span className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-center text-sm font-semibold text-zinc-600">
              অনলাইন অনুরোধ ফর্ম সাময়িক বন্ধ — জরুরি কল ব্যবহার করুন
            </span>
          )}
          <TrackedOutboundAnchor
            href={telEmergency}
            tracking="tel"
            className={`min-h-[48px] flex-1 rounded-2xl text-[1.05rem] font-bold sm:max-w-xs ${landingBtnOutlineEmerald}`}
          >
            জরুরি কল
          </TrackedOutboundAnchor>
        </div>
      </div>
    </section>
  );
}
