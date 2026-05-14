const FAQ: { q: string; a: string }[] = [
  {
    q: "ডাক্তার কি বাসায় আসবেন?",
    a: "হ্যাঁ, হোম/খামার ভিজিটের ব্যবস্থা করা হয়। চূড়ান্ত সময় ডাক্তার আপনার নম্বরে কল করে নির্ধারণ করবেন।",
  },
  {
    q: "কত দ্রুত যোগাযোগ করা হবে?",
    a: "অনুরোধের ভিড় ও এলাকার ওপর নির্ভর করে; জরুরি উল্লেখ করলে অগ্রাধিকার দেওয়া হয়।",
  },
  {
    q: "কোন এলাকায় সেবা পাওয়া যাবে?",
    a: "ঢাকা ও পার্শ্ববর্তী এলাকায়। ফর্মে এলাকা বাছাই করুন।",
  },
  {
    q: "জরুরি কেসে কী করবেন?",
    a: "প্রথমে নিরাপদ ব্যবস্থা নিন। আমাদের জরুরি লাইনে কল করুন এবং ফর্মে বিস্তারিত লিখুন।",
  },
];

export function HomeFaqSection() {
  return (
    <section className="border-b border-emerald-100/60 bg-[#f7faf8] py-6 sm:py-8">
      <div className="mx-auto w-full max-w-2xl px-3 sm:px-4">
        <h2 className="text-center text-lg font-bold text-zinc-900 sm:text-xl">প্রায়শই জিজ্ঞাসা</h2>
        <div className="mt-4 space-y-2">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-zinc-200/80 bg-white shadow-sm open:border-emerald-200/80"
            >
              <summary className="cursor-pointer list-none px-3 py-3 text-sm font-semibold text-zinc-900 marker:content-none [&::-webkit-details-marker]:hidden sm:px-4 sm:text-base">
                <span className="flex min-h-[40px] items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 text-pretty leading-snug">{item.q}</span>
                  <span className="shrink-0 text-emerald-600 transition group-open:rotate-180" aria-hidden>
                    ▼
                  </span>
                </span>
              </summary>
              <p className="border-t border-zinc-100 px-3 pb-3 pt-2 text-sm leading-relaxed text-zinc-600 sm:px-4 sm:pb-3">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
