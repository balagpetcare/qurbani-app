import Link from "next/link";

import { landingTelHref, landingWhatsAppHref } from "@/components/landing/landing-contact";
import type { LandingAreaChip } from "@/lib/landing-public-data";
import type { LandingPublicPayload } from "@/lib/site-settings";
import {
  landingCallNumberDisplay,
  landingWhatsAppNumberDisplay,
} from "@/lib/public-contact";

type Props = {
  lp: LandingPublicPayload;
  areas: LandingAreaChip[];
};

export function HomeSiteFooter({ lp, areas }: Props) {
  const telMain = landingTelHref(lp.phoneCallDigits);
  const telEmergency = landingTelHref(lp.emergencyDigits);
  const waHref = landingWhatsAppHref(lp.whatsappDigits);
  const areaChips = areas.filter((a) => a.isPopular).slice(0, 8);
  const areaFallback = areas.slice(0, 8);

  return (
    <footer className="border-t border-emerald-200/60 bg-white/95 px-3 py-6 text-sm text-zinc-700 sm:rounded-b-[28px] sm:px-5 sm:py-8">
      <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
        <div>
          <p className="text-base font-bold text-zinc-900">{lp.publicSiteTitle}</p>
          <p className="mt-1 text-xs text-zinc-600">কুরবানি ২০২৬ · ভেটেরিনারি জরুরি সেবা</p>
          <div className="mt-3 space-y-1.5 text-sm">
            <p>
              <span className="text-zinc-500">হটলাইন: </span>
              <a href={telMain} className="font-semibold text-q-primary underline">
                {landingCallNumberDisplay(lp.phoneCallDigits)}
              </a>
            </p>
            <p>
              <span className="text-zinc-500">জরুরি: </span>
              <a href={telEmergency} className="font-semibold text-q-primary underline">
                {landingCallNumberDisplay(lp.emergencyDigits)}
              </a>
            </p>
            <p>
              <span className="text-zinc-500">WhatsApp: </span>
              <a href={waHref} className="font-semibold text-q-primary underline" target="_blank" rel="noreferrer">
                {landingWhatsAppNumberDisplay(lp.whatsappDigits)}
              </a>
            </p>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">সেবা এলাকা</p>
          <p className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {(areaChips.length ? areaChips : areaFallback).map((a) => (
              <span
                key={a.id}
                className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-900 ring-1 ring-emerald-100/80"
              >
                {a.nameBn ?? a.name}
              </span>
            ))}
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-q-primary">
            <li>
              <Link href="/request" className="underline">
                অনুরোধ
              </Link>
            </li>
            <li>
              <Link href="/doctors" className="underline">
                ডাক্তার
              </Link>
            </li>
            <li>
              <Link href="/track" className="underline">
                ট্র্যাক
              </Link>
            </li>
            <li>
              <Link href="/admin" className="text-zinc-400 underline hover:text-zinc-600">
                অ্যাডমিন
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-relaxed text-zinc-500">
        গ্রাহকের তথ্য নিরাপদ রাখা হয় · অভিজ্ঞ ডাক্তার নেটওয়ার্ক
      </p>
      <p className="mt-3 text-center text-[0.7rem] text-zinc-400">
        © {new Date().getFullYear()} {lp.publicSiteTitle}
      </p>
    </footer>
  );
}
