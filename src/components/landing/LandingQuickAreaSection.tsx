import Link from "next/link";

import type { LandingAreaChip } from "@/lib/landing-public-data";

import { landingBtnNeutralOutline, landingBtnSolidPrimary } from "./landing-button-classes";
import { LANDING_REQUEST_PATH } from "./landing-contact";

type Props = {
  areas: LandingAreaChip[];
  leadFormEnabled: boolean;
};

export function LandingQuickAreaSection({ areas, leadFormEnabled }: Props) {
  const chips = areas.slice(0, 12);

  return (
    <section className="border-b border-emerald-100/60 bg-[#f4faf7] py-8 sm:py-10">
      <div className="mx-auto w-full min-w-0 max-w-3xl px-2 sm:px-3">
        <h2 className="text-center text-xl font-bold text-zinc-900 sm:text-2xl">
          আপনার এলাকা নির্বাচন করুন
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-base leading-relaxed text-zinc-700">
          কোন এলাকায় সেবা প্রয়োজন? এলাকা বাছাই করুন — সংশ্লিষ্ট এলাকার ডাক্তারদের সাথে যোগাযোগ
          করানো হবে।
        </p>
        {chips.length === 0 ? (
          <p className="mt-5 text-center text-base text-zinc-600">
            এলাকার তালিকা লোড হচ্ছে। আপনার ঠিকানা জানাতে সরাসরি{" "}
            <Link href={LANDING_REQUEST_PATH} className="font-semibold text-emerald-700 underline">
              চিকিৎসার ফর্ম
            </Link>
            -এ যান।
          </p>
        ) : (
          <ul className="mx-auto my-2 mt-6 flex min-w-0 max-w-2xl flex-wrap justify-center gap-2 px-0.5 sm:px-1">
            {chips.map((a) => (
              <li key={a.id} className="max-w-full min-w-0">
                <Link
                  href={`${LANDING_REQUEST_PATH}?area=${a.id}`}
                  className="inline-flex max-w-[100%] min-h-[44px] items-center justify-center break-words rounded-full border border-emerald-300/90 bg-white px-4 py-2 text-center text-sm font-semibold leading-snug text-emerald-950 shadow-sm ring-1 ring-emerald-100/80 transition hover:bg-emerald-50 touch-manipulation sm:px-4 sm:py-2 sm:text-[0.9375rem]"
                >
                  {a.nameBn ?? a.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mx-auto mt-7 flex max-w-md min-w-0 flex-col gap-3 sm:mx-auto sm:flex-row sm:justify-center">
          {leadFormEnabled ? (
            <Link href={LANDING_REQUEST_PATH} className={`touch-manipulation ${landingBtnSolidPrimary}`}>
              চিকিৎসার জন্য জানান
            </Link>
          ) : null}
          <Link href="/doctors" className={`touch-manipulation ${landingBtnNeutralOutline}`}>
            ডাক্তারদের তথ্য দেখুন
          </Link>
        </div>
      </div>
    </section>
  );
}
