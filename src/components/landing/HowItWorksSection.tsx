const STEPS: { step: string; title: string; body: string }[] = [
  {
    step: "১",
    title: "আমাদের জানান",
    body: "ফর্মে নাম, যোগাযোগ, এলাকা ও সমস্যার বিবরণ দিন — দ্রুত খোঁজ নেওয়া হয়।",
  },
  {
    step: "২",
    title: "ডাক্তার খোঁজা",
    body: "আপনার এলাকা ও সমস্যা দেখে উপযুক্ত ডাক্তার খুঁজে নেওয়া হয়।",
  },
  {
    step: "৩",
    title: "ডাক্তারের সাথে কথা বলা",
    body: "ডাক্তার চূড়ান্ত হওয়ার পর তিনি নিজেই আপনার দেওয়া নম্বরে কল করবেন। পাবলিক পেজে ডাক্তারের ব্যক্তিগত নম্বর দেখানো হয় না।",
  },
  {
    step: "৪",
    title: "চিকিৎসা ও ফলো-আপ",
    body: "পর্যবেক্ষণ, পরামর্শ ও প্রয়োজনীয় ফলো-আপ — প্রয়োজনীয় আপডেট জানতে পারবেন।",
  },
];

export function HowItWorksSection() {
  return (
    <section className="border-b border-emerald-100/80 bg-white py-8 sm:py-10">
      <div className="mx-auto w-full max-w-3xl px-1 sm:px-2">
        <h2 className="text-center text-xl font-bold text-zinc-900 sm:text-2xl">
          কীভাবে কাজ করে
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-base leading-relaxed text-zinc-700">
          খুব সহজেই সেবা নিন মাত্র ৪টি ধাপে:
        </p>
        <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 xl:gap-4">
          {STEPS.map((s) => (
            <li
              key={s.step}
              className="rounded-2xl border border-zinc-200/90 bg-[#fafdfb] p-5 shadow-md ring-1 ring-emerald-100/40 sm:rounded-3xl"
            >
              <span
                className="mb-3 inline-flex size-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-emerald-600 text-base font-bold text-white"
                aria-hidden
              >
                {s.step}
              </span>
              <h3 className="text-lg font-semibold text-zinc-900">{s.title}</h3>
              <p className="mt-2 text-base leading-relaxed text-zinc-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
