import Link from "next/link";

import { landingBtnPrimaryOnDark, landingBtnSecondaryOnDark } from "./landing-button-classes";
import { LANDING_REQUEST_PATH } from "./landing-contact";

type Props = {
  leadFormEnabled: boolean;
  applicationsEnabled: boolean;
};

export function LandingFinalCtaSection({ leadFormEnabled, applicationsEnabled }: Props) {
  return (
    <section className="bg-gradient-to-br from-emerald-900 via-q-primary to-emerald-800 py-10 text-white sm:py-12">
      <div className="mx-auto w-full max-w-3xl px-4 text-center sm:px-5">
        <h2 className="text-xl font-bold leading-snug sm:text-2xl">
          এখনই চিকিৎসার জন্য জানান
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-emerald-100">
          আপনার পশুর সমস্যা, ঠিকানা ও যোগাযোগের নম্বর দিন—আমরা দ্রুত ব্যবস্থা নেওয়ার চেষ্টা করব।{" "}
          <Link
            href="/doctors"
            className="font-semibold text-white underline decoration-emerald-200/90 underline-offset-2 hover:text-emerald-50"
          >
            ডাক্তারদের তথ্য দেখুন
          </Link>
        </p>
        <div className="mx-auto mt-6 flex max-w-md min-w-0 flex-col gap-3 sm:mx-auto sm:flex-row sm:justify-center">
          {leadFormEnabled ? (
            <Link
              href={LANDING_REQUEST_PATH}
              className={`touch-manipulation ${landingBtnPrimaryOnDark}`}
            >
              চিকিৎসার জন্য জানান
            </Link>
          ) : null}
          {applicationsEnabled ? (
            <Link href="/doctor/apply" className={`touch-manipulation ${landingBtnSecondaryOnDark}`}>
              ডাক্তার হিসেবে যুক্ত হন
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
