import type { PublicShowcaseCase } from "@/lib/landing-public-data";

const PLACEHOLDER_CASES: PublicShowcaseCase[] = [
  {
    title: "গবাদি পশু · পেট ফাঁপা ও অস্বস্তি",
    summary:
      "সরাসরি চিকিৎসা ও পরামর্শের পর অবস্থা স্থিতিশীল হয়। গ্রাহকের নাম ও নম্বর গোপন রাখা হয়েছে।",
    areaLabel: "উত্তরা",
    whenLabel: "২০২৬ · উদাহরণ",
  },
  {
    title: "ছাগল · খাওয়া কমে যাওয়া",
    summary:
      "জ্বর সন্দেহ ও খাদ্য গ্রহণ কমে যাওয়া — চিকিৎসা ও ফলো-আপে উন্নতি। শুধু সাধারণ বিবরণ, কোনো ব্যক্তিগত তথ্য নয়।",
    areaLabel: "মিরপুর",
    whenLabel: "২০২৬ · উদাহরণ",
  },
  {
    title: "গরু · চলাফেরায় অসুবিধা",
    summary:
      "পায়ের ফোলা ও চলাফেরায় সমস্যা — পরিকল্পিত পরামর্শে হাঁটাচলা স্বাভাবিক হয়। পরিচয় গোপন রাখা হয়েছে।",
    areaLabel: "সাভার ও আশেপাশে",
    whenLabel: "২০২৬ · উদাহরণ",
  },
];

type Props = { cases: PublicShowcaseCase[] };

export function CaseShowcaseSection({ cases }: Props) {
  const list = cases.length >= 2 ? cases : PLACEHOLDER_CASES;
  const fromDb = cases.length >= 2;

  return (
    <section className="border-b border-emerald-100/60 bg-[#f0f7f3] px-0 py-8 sm:py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-5">
        <h2 className="text-center text-xl font-bold text-zinc-900 sm:text-2xl">
          সফল চিকিৎসার কিছু উদাহরণ
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-base text-zinc-700">
          {fromDb
            ? "গ্রাহকের গোপনীয়তা রক্ষার্থে আসল নাম ও নম্বর গোপন রাখা হয়েছে। নিচের তালিকায় ডাক্তারদের দেওয়া সাধারণ তথ্য থেকে সংক্ষিপ্ত বিবরণ দেখানো হয়।"
            : "গ্রাহকের গোপনীয়তা রক্ষার্থে আসল নাম ও নম্বর গোপন রাখা হয়েছে। এখানে কিছু সাধারণ চিকিৎসার নমুনা দেওয়া হলো।"}
        </p>
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {list.map((c, i) => (
            <li
              key={`case-${i}-${c.areaLabel}-${c.title}`}
              className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-md ring-1 ring-emerald-100/30 sm:rounded-3xl"
            >
              <dl className="space-y-3 text-base">
                <div>
                  <dt className="text-sm font-medium text-zinc-500">সমস্যা</dt>
                  <dd className="mt-0.5 font-semibold leading-snug text-zinc-900">{c.title}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500">ফলাফল</dt>
                  <dd className="mt-0.5 leading-relaxed text-zinc-800">{c.summary}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500">এলাকা</dt>
                  <dd className="mt-0.5 font-medium text-zinc-800">{c.areaLabel}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500">সময়</dt>
                  <dd className="mt-0.5 text-zinc-600">{c.whenLabel}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
