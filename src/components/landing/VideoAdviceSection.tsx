import Link from "next/link";

import { LANDING_LEAD_FORM_HASH } from "./landing-contact";

/** Lightweight placeholders — swap for DB-driven list when AdviceVideo exists. */
const SAMPLE_VIDEOS: { title: string; category: string; href: string }[] = [
  {
    title: "কেনার আগে পশু দেখার সাধারণ টিপস",
    category: "প্রস্তুতি",
    href: "https://www.youtube.com/results?search_query=qurbani+cattle+health+check",
  },
  {
    title: "ফাঁপা পেট দেখলে কী করবেন",
    category: "জরুরি লক্ষণ",
    href: "https://www.youtube.com/results?search_query=bloat+cattle+first+aid",
  },
  {
    title: "জ্বর চেনার প্রাথমিক ধারণা",
    category: "লক্ষণ",
    href: "https://www.youtube.com/results?search_query=cattle+fever+signs",
  },
];

export function VideoAdviceSection() {
  return (
    <section className="border-b border-zinc-100 bg-white py-10 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:py-14 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold leading-tight text-zinc-900 sm:text-3xl lg:text-4xl">
          ভিডিও পরামর্শ
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-zinc-600 sm:text-base">
          নিচের লিংকগুলো বাহ্যিক অনুসন্ধানের জন্য — আমাদের নিজস্ব ডাক্তারের ভিডিও লাইব্রেরি
          শীঘ্রই যুক্ত হবে। ইন্টারনেট চার্জ ও ডাটা খরচ নিজ দায়িত্বে দেখুন।
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-3">
          {SAMPLE_VIDEOS.map((v) => (
            <li
              key={v.title}
              className="flex min-w-0 flex-col rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5 shadow-sm"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                {v.category}
              </span>
              <h3 className="mt-2 text-base font-semibold leading-snug text-zinc-900">
                {v.title}
              </h3>
              <a
                href={v.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-[44px] touch-manipulation items-center justify-center rounded-lg border border-emerald-600 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 active:bg-emerald-50"
              >
                দেখতে লিংক খুলুন
              </a>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-8 max-w-xl text-center text-xs text-zinc-500">
          আপনার নির্দিষ্ট সমস্যার জন্য{" "}
          <Link
            href={LANDING_LEAD_FORM_HASH}
            className="touch-manipulation font-semibold text-emerald-700 underline"
          >
            ফর্মে লিখে পাঠান
          </Link>
          — ডাক্তার সরাসরি ফোন/ভিজিটে নির্দেশ দেবেন।
        </p>
      </div>
    </section>
  );
}
