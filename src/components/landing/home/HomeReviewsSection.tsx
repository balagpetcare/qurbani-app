import type { PublicShowcaseCase } from "@/lib/landing-public-data";

const PLACEHOLDER: PublicShowcaseCase[] = [
  {
    title: "গরু · খাওয়া বন্ধ",
    summary: "৩ দিন খাচ্ছিল না — চিকিৎসা ও ফলোআপে এখন সুস্থ।",
    areaLabel: "উত্তরা",
    whenLabel: "২০২৬ · উদাহরণ",
    doctorLabel: "ডাক্তার দল",
    treatmentTypeLabel: "গরু · জ্বর / খাওয়া বন্ধ",
  },
  {
    title: "ছাগল · দুর্বলতা",
    summary: "জরুরি ভিজিট ও সাপোর্টিভ কেয়ারে দ্রুত উন্নতি।",
    areaLabel: "মিরপুর",
    whenLabel: "২০২৬ · উদাহরণ",
    doctorLabel: null,
    treatmentTypeLabel: "ছাগল · জরুরি দুর্বলতা",
  },
];

type Props = { cases: PublicShowcaseCase[] };

function StarRow() {
  return (
    <p className="text-amber-500" aria-label="রেটিং ৫ এর মধ্যে ৪.৮">
      ★★★★<span className="text-amber-300">★</span>
      <span className="ml-1 text-xs font-semibold text-zinc-600">৪.৮</span>
    </p>
  );
}

export function HomeReviewsSection({ cases }: Props) {
  const list = cases.length >= 2 ? cases : PLACEHOLDER;

  return (
    <section className="border-b border-emerald-100/60 bg-white py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl px-3 sm:px-4">
        <h2 className="text-lg font-bold text-zinc-900 sm:text-xl">সফলতার গল্প</h2>
        <p className="mt-1 max-w-xl text-sm text-zinc-600">
          গোপনীয়তা রক্ষা করে শুধু সাধারণ ফলাফল — আপনার পশুর মতোই অনেক কেস সম্পন্ন হয়েছে।
        </p>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] sm:gap-4">
          {list.map((c, i) => (
            <article
              key={`${c.areaLabel}-${i}-${c.title}`}
              className="w-[min(88vw,20rem)] shrink-0 snap-start rounded-2xl border border-emerald-100/90 bg-[#fafdfb] p-4 shadow-md ring-1 ring-emerald-50/80"
            >
              <StarRow />
              <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-zinc-900">{c.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-700">{c.summary}</p>
              <dl className="mt-3 space-y-1 border-t border-emerald-100/60 pt-3 text-xs text-zinc-600">
                {c.doctorLabel ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">ডাক্তার</dt>
                    <dd className="min-w-0 truncate font-medium text-zinc-800">{c.doctorLabel}</dd>
                  </div>
                ) : null}
                {c.treatmentTypeLabel ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">ধরন</dt>
                    <dd className="min-w-0 truncate font-medium text-zinc-800">{c.treatmentTypeLabel}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">এলাকা</dt>
                  <dd className="font-medium text-zinc-800">{c.areaLabel}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">সময়</dt>
                  <dd>{c.whenLabel}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
