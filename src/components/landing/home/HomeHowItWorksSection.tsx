const STEPS = [
  { icon: "📝", title: "অনুরোধ দিন", sub: "ফর্ম / কল" },
  { icon: "📞", title: "ডাক্তার যোগাযোগ", sub: "দ্রুত কলব্যাক" },
  { icon: "🏠", title: "বাসায়/খামারে", sub: "ভিজিট প্ল্যান" },
  { icon: "💊", title: "চিকিৎসা ও ফলোআপ", sub: "পরবর্তী যত্ন" },
];

export function HomeHowItWorksSection() {
  return (
    <section className="border-b border-emerald-100/60 bg-[#fafdfb] py-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl px-3 sm:px-4">
        <h2 className="text-center text-lg font-bold text-zinc-900 sm:text-xl">কীভাবে কাজ করে</h2>
        <p className="mx-auto mt-1 max-w-md text-pretty text-center text-sm text-zinc-600">চারটি সহজ ধাপ।</p>
        <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="flex flex-col items-center rounded-2xl border border-emerald-100/80 bg-white px-2 py-4 text-center shadow-sm ring-1 ring-emerald-50/80"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="mt-2 text-2xl" aria-hidden>
                {s.icon}
              </span>
              <p className="mt-2 text-sm font-bold leading-tight text-zinc-900">{s.title}</p>
              <p className="mt-1 text-[0.7rem] text-zinc-500">{s.sub}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
