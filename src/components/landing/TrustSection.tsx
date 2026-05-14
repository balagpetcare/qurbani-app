import Link from "next/link";

import { TrackedOutboundAnchor } from "@/components/analytics/TrackedOutboundAnchor";

import { landingTelHref, landingWhatsAppHref, LANDING_REQUEST_PATH } from "./landing-contact";

type Props = {
  phoneDigits: string;
  whatsAppDigits: string;
  leadFormEnabled: boolean;
};

export function TrustSection({ phoneDigits, whatsAppDigits, leadFormEnabled }: Props) {
  const telHref = landingTelHref(phoneDigits);
  const waHref = landingWhatsAppHref(whatsAppDigits);

  const bullets = [
    "দক্ষ ভেটেরিনারি টিম",
    "দ্রুত যোগাযোগ ও ফলো-আপ",
    "ঢাকা এরিয়া সাপোর্ট",
    "কল · WhatsApp · সংক্ষিপ্ত অনুরোধ ফর্ম",
  ];

  return (
    <section className="border-b border-zinc-100 bg-emerald-50/40 px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold leading-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          কেন আমাদের সাথে যোগাযোগ করবেন
        </h2>
        <ul className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
          {bullets.map((t) => (
            <li
              key={t}
              className="flex min-w-0 items-start gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm font-medium leading-relaxed text-zinc-800 shadow-sm"
            >
              <span
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white"
                aria-hidden
              >
                ✓
              </span>
              {t}
            </li>
          ))}
        </ul>
        <div className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
          <TrackedOutboundAnchor
            href={telHref}
            tracking="tel"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
          >
            কল করুন
          </TrackedOutboundAnchor>
          <TrackedOutboundAnchor
            href={waHref}
            tracking="whatsapp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border-2 border-emerald-600 bg-white px-5 py-3 text-center text-sm font-semibold text-emerald-900 hover:bg-emerald-50"
          >
            WhatsApp করুন
          </TrackedOutboundAnchor>
          {leadFormEnabled ? (
            <Link
              href={LANDING_REQUEST_PATH}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-zinc-800"
            >
              জরুরি অনুরোধ করুন
            </Link>
          ) : (
            <span className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-3 py-3 text-center text-xs font-medium text-zinc-600">
              ফর্ম বন্ধ
            </span>
          )}
        </div>
        <p className="mx-auto mt-8 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm leading-relaxed text-amber-950">
          <strong className="font-semibold">জরুরি:</strong> প্রাণ সংকট বা গুরুতর অবস্থায় প্রথমে
          নিরাপদ ব্যবস্থা নিন এবং সম্ভব হলে কল করুন — আমরা গাইড করব কীভাবে এগোবেন।
        </p>
      </div>
    </section>
  );
}
