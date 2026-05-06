"use client";

import Link from "next/link";

import {
  landingTelHref,
  landingWhatsAppHref,
  LANDING_REQUEST_PATH,
} from "./landing-contact";

type Props = {
  phoneDigits: string;
  whatsAppDigits: string;
  leadFormEnabled: boolean;
};

/**
 * Mobile-first sticky bar; desktop users already have hero CTAs.
 */
export function StickyLandingCta({
  phoneDigits,
  whatsAppDigits,
  leadFormEnabled,
}: Props) {
  const telHref = landingTelHref(phoneDigits);
  const waHref = landingWhatsAppHref(whatsAppDigits);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="border-t border-emerald-200/80 bg-white/95 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur">
        <nav
          className="mx-auto flex w-full min-w-0 max-w-lg items-stretch justify-center gap-2 px-1"
          aria-label="দ্রুত যোগাযোগ"
        >
          <a
            href={telHref}
            className="touch-manipulation flex min-h-[52px] min-w-0 flex-1 items-center justify-center break-words rounded-xl bg-emerald-600 px-2 text-center text-sm font-semibold leading-snug text-white active:bg-emerald-700"
          >
            কল
          </a>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="touch-manipulation flex min-h-[52px] min-w-0 flex-1 items-center justify-center break-words rounded-xl border-2 border-emerald-600 bg-white px-2 text-center text-sm font-semibold leading-snug text-emerald-900 active:bg-emerald-50"
          >
            WhatsApp
          </a>
          {leadFormEnabled ? (
            <Link
              href={LANDING_REQUEST_PATH}
              aria-label="চিকিৎসার জন্য জানান — ফর্ম খুলুন"
              className="touch-manipulation flex min-h-[52px] min-w-0 flex-1 items-center justify-center break-words rounded-xl bg-zinc-900 px-1 text-center text-[0.8125rem] font-semibold leading-snug text-white active:bg-zinc-800 sm:text-sm"
            >
              অনুরোধ
            </Link>
          ) : (
            <span className="touch-manipulation flex min-h-[52px] min-w-0 flex-1 items-center justify-center break-words rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-1 text-center text-[0.75rem] font-semibold leading-snug text-zinc-600 sm:text-sm">
              ফর্ম বন্ধ
            </span>
          )}
        </nav>
      </div>
    </div>
  );
}
