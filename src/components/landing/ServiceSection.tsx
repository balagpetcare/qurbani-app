const SERVICES: { title: string; desc: string }[] = [
  {
    title: "কোরবানির পশুর স্বাস্থ্য পরীক্ষা",
    desc: "কেনার আগে বা যাত্রার সময় সাধারণ চেক ও পরামর্শ।",
  },
  {
    title: "জ্বর / দুর্বলতা",
    desc: "লক্ষণ দেখে প্রাথমিক পরামর্শ ও পরবর্তী পদক্ষেপ।",
  },
  {
    title: "খাওয়া বন্ধ",
    desc: "ক্ষুধামান্দ্য থাকলে দ্রুত মূল্যায়ন ও গাইডলাইন।",
  },
  {
    title: "ক্ষত / আঘাত",
    desc: "আঘাত বা সংক্রমণ সন্দেহে পরামর্শ ও রেফারেল।",
  },
  {
    title: "ইনজেকশন / স্যালাইন সাপোর্ট",
    desc: "প্রয়োজন অনুযায়ী চিকিৎসা পরিকল্পনা ও ফলো-আপ।",
  },
  {
    title: "জরুরি ডাক্তার ভিজিট",
    desc: "সম্ভব হলে দ্রুত ভিজিট বা গাইডেন্স।",
  },
  {
    title: "পশু কেনার আগে স্বাস্থ্য পরীক্ষা",
    desc: "হাট বা খামার থেকে কেনার আগে হেলথ চেক পরামর্শ।",
  },
];

export function ServiceSection() {
  return (
    <section className="border-b border-zinc-100 bg-white px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold text-zinc-900 sm:text-3xl">
          আমরা যেসব সমস্যায় সাহায্য করি
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-zinc-600 sm:text-base">
          প্রতিটি ক্ষেত্রে দ্রুত যোগাযোগ ও পরামর্শ — পরিস্থিতি ভেদে ভিজিট বা রেফারেল সাজেস্ট করা
          হয়।
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/40"
            >
              <h3 className="font-semibold text-zinc-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
